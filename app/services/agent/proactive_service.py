"""Bounded proactive evaluation for meaningful inventory conditions.

The inventory domain remains responsible for deciding *whether* a condition
exists.  This service only receives an already-created high-severity expiry
alert, gathers further context through an explicit code-level allowlist of
read tools, and asks the code-governed action executor to create the internal
recommendation notification.

No mutating AgentTool is available to this runner.  This is enforced twice
in code: only ``read_tool_schemas`` are sent to the LLM and every requested
tool is checked against ``PROACTIVE_READ_TOOL_NAMES`` before execution. The
only write is a fixed internal tool selected by orchestration code after the
LLM returns, never by the LLM itself.
"""
from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime
from typing import Any, Optional

from fastapi.encoders import jsonable_encoder
from sqlalchemy import case
from sqlalchemy.orm import Session

from app.models import CanhBaoTonKho, ProactiveInsight
from app.services.agent import agent_service, observability
from app.services.agent.proactive_actions import (
    automation_idempotency_key,
    build_alert_condition,
    insight_fingerprint,
)
from app.services.agent import tools as tool_registry
from app.services.alerts import AlertService
from app.services.alerts.alert_service import is_current_high_expiry_alert
from app.services.alerts.product_stock import PRODUCT_STOCK_ALERT_TYPE
from app.services.errors import DomainError

logger = logging.getLogger("bakeryonl.agent.proactive")

PROACTIVE_SCENARIO = "expiring_batch"
PRODUCT_STOCK_SCENARIO = "product_stock"
PROACTIVE_PROMPT_VERSION = "operations-agent-proactive-v1"
PRODUCT_STOCK_PROMPT_VERSION = "operations-agent-product-stock-v1"
PROACTIVE_MODEL = "deepseek-chat"
PROACTIVE_MAX_TOOL_ITERATIONS = 3

# This is an execution boundary, not a prompt convention.  Keeping this
# explicit and small makes a review of unattended capabilities trivial.
PROACTIVE_READ_TOOL_NAMES = frozenset({
    "get_alert_summary",
    "list_pending_alerts",
    "get_expiring_batches",
    "get_replenishment_signals",
})
_EXPIRY_ALERT_TYPES = frozenset({"sap_het_han", "qua_han"})
_ACTIVE_ALERT_STATUSES = ("chua_xu_ly", "dang_xu_ly")
_OPEN_INSIGHT_STATUSES = ("unread", "read")

_PROMPT = """You are the Leaf Creme Operations Agent running an unattended review.
The business condition was already detected deterministically. Do not change its
severity or invent data. You may call only the provided read tools for context.
Return a concise Vietnamese recommendation for an admin: what to review first
and why, grounded only in the alert and tool results. Do not claim that any
inventory, order, or batch change has happened and do not recommend a numeric
sales, waste, revenue, or replenishment quantity that was not returned by a tool.
For product-stock digests, summarize categories and affected sizes without
repeating one notification per size."""


def _assert_read_allowlist() -> None:
    for name in PROACTIVE_READ_TOOL_NAMES:
        tool = tool_registry.get_tool(name)
        if tool.classification != "read":
            raise RuntimeError(f"Proactive tool {name!r} is not read-only")


def proactive_tool_schemas() -> list[dict[str, Any]]:
    """Schemas passed to the proactive LLM, restricted by code."""
    _assert_read_allowlist()
    return tool_registry.read_tool_schemas(PROACTIVE_READ_TOOL_NAMES)


def _execute_read_tool(db: Session, name: str, params: dict[str, Any]) -> dict[str, Any]:
    """Execute a proactive tool call without any user or mutation path."""
    if name not in PROACTIVE_READ_TOOL_NAMES:
        raise DomainError(status_code=400, detail=f"Proactive runner cannot call tool '{name}'")

    tool = tool_registry.get_tool(name)
    if tool.classification != "read":
        # Defensive guard if a future registry change reclassifies a tool.
        raise RuntimeError(f"Proactive runner refused non-read tool '{name}'")

    tool_registry.validate_params(tool, params)
    # Current proactive tools are domain reads and do not inspect a user.  A
    # missing user is intentional: unattended analysis must not impersonate
    # an admin account merely to read operational state.
    return jsonable_encoder(tool.execute(db, params, None))  # type: ignore[arg-type]


def _deterministic_recommendation(condition: dict[str, Any]) -> str:
    if condition.get("scenario") == PRODUCT_STOCK_SCENARIO:
        count = int(condition.get("product_count") or 0)
        sizes = int(condition.get("affected_size_count") or 0)
        unavailable = int(condition.get("unavailable_product_count") or 0)
        products = [str(row.get("product")) for row in condition.get("products", []) if row.get("product")]
        preview = ", ".join(products[:5])
        suffix = f"; gồm {preview}" if preview else ""
        if len(products) > 5:
            suffix += f" và {len(products) - 5} sản phẩm khác"
        return (
            f"Có {count} sản phẩm với {sizes} kích thước cần bổ sung hàng; "
            f"{unavailable} sản phẩm hiện không còn kích thước nào bán được{suffix}. "
            "Ưu tiên kiểm tra kế hoạch sản xuất/nhập lô và hạn dùng trước khi mở bán lại. "
            "Chưa đủ dữ liệu để tự đề xuất số lượng nhập."
        )

    product = condition.get("product") or f"lô #{condition.get('batch_id')}"
    batch = condition.get("batch_code")
    expiry = condition.get("expires_at")
    units = condition.get("units_on_hand")
    parts = [f"Ưu tiên kiểm tra {product}"]
    if batch:
        parts.append(f"(lô {batch})")
    if expiry:
        parts.append(f"vì hạn dùng là {expiry}")
    if units is not None:
        parts.append(f"và hiện còn {units} đơn vị")
    return " ".join(parts) + ". Xác nhận tình trạng lô trước khi quyết định tạm dừng bán, xử lý hủy hoặc cập nhật cảnh báo."


def _run_llm_evaluation(
    db: Session,
    condition: dict[str, Any],
) -> tuple[str, list[dict[str, Any]], bool, Optional[str]]:
    """Run a bounded tool-use loop. Failure deliberately returns fallback."""
    scenario = str(condition.get("scenario") or PROACTIVE_SCENARIO)
    prompt_version = (
        PRODUCT_STOCK_PROMPT_VERSION if scenario == PRODUCT_STOCK_SCENARIO else PROACTIVE_PROMPT_VERSION
    )
    with observability.trace_proactive_evaluation(
        int(condition["alert_id"]),
        condition,
        prompt_version=prompt_version,
        scenario=scenario,
    ) as span:
        trace_id = observability.get_trace_id(span)
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            fallback = _deterministic_recommendation(condition)
            observability.safe_update(span, output=fallback, metadata={"mode": "deterministic_fallback"})
            observability.flush()
            return fallback, [], False, trace_id

        try:
            import openai

            client = openai.OpenAI(
                api_key=api_key,
                base_url=os.getenv("DEEPSEEK_BASE_URL") or "https://api.deepseek.com",
            )
            messages: list[dict[str, Any]] = [
                {"role": "system", "content": _PROMPT},
                {"role": "user", "content": json.dumps({"condition": condition}, ensure_ascii=False, default=str)},
            ]
            trace: list[dict[str, Any]] = []

            for iteration in range(PROACTIVE_MAX_TOOL_ITERATIONS):
                started = time.monotonic()
                with observability.trace_llm_call(PROACTIVE_MODEL, iteration) as generation:
                    observability.safe_update(generation, input=observability.redact(messages))
                    response = client.chat.completions.create(
                        model=PROACTIVE_MODEL,
                        max_tokens=500,
                        tools=proactive_tool_schemas(),
                        messages=messages,
                    )
                    choice = response.choices[0]
                    usage = getattr(response, "usage", None)
                    observability.safe_update(
                        generation,
                        output={
                            "content": choice.message.content,
                            "tool_calls": [
                                {"name": call.function.name, "arguments": call.function.arguments}
                                for call in (choice.message.tool_calls or [])
                            ],
                        },
                        usage_details=(
                            {
                                "input_tokens": getattr(usage, "prompt_tokens", None),
                                "output_tokens": getattr(usage, "completion_tokens", None),
                            }
                            if usage else None
                        ),
                        metadata={"latency_ms": round((time.monotonic() - started) * 1000)},
                    )

                if choice.finish_reason != "tool_calls" or not choice.message.tool_calls:
                    recommendation = (choice.message.content or "").strip() or _deterministic_recommendation(condition)
                    observability.safe_update(span, output=recommendation)
                    observability.flush()
                    return recommendation, trace, True, trace_id

                messages.append({
                    "role": "assistant",
                    "content": choice.message.content,
                    "tool_calls": [
                        {"id": call.id, "type": "function", "function": {"name": call.function.name, "arguments": call.function.arguments}}
                        for call in choice.message.tool_calls
                    ],
                })
                for call in choice.message.tool_calls:
                    try:
                        params = json.loads(call.function.arguments or "{}")
                        with observability.trace_tool_call(call.function.name, params) as tool_span:
                            started = time.monotonic()
                            output = _execute_read_tool(db, call.function.name, params)
                            observability.safe_update(
                                tool_span,
                                output=output,
                                metadata={"latency_ms": round((time.monotonic() - started) * 1000)},
                            )
                        trace.append({"tool": call.function.name, "input": params, "outcome": "executed"})
                    except (DomainError, ValueError, TypeError, json.JSONDecodeError) as exc:
                        output = {"error": str(getattr(exc, "detail", exc))}
                        trace.append({"tool": call.function.name, "outcome": "rejected"})
                    messages.append({"role": "tool", "tool_call_id": call.id, "content": json.dumps(output, ensure_ascii=False, default=str)})

            fallback = _deterministic_recommendation(condition)
            observability.safe_update(span, output=fallback, level="WARNING", status_message="tool_call_limit")
            observability.flush()
            return fallback, trace, True, trace_id
        except Exception:
            logger.exception("Proactive LLM evaluation failed; using deterministic recommendation")
            fallback = _deterministic_recommendation(condition)
            observability.safe_update(span, output=fallback, level="ERROR", status_message="llm_fallback")
            observability.flush()
            return fallback, [], False, trace_id


def _supersede_noncurrent_insights(
    db: Session,
    current_alert_ids: set[int],
    scenarios: frozenset[str],
) -> int:
    active_ids = db.query(CanhBaoTonKho.canhbao_id).filter(
        CanhBaoTonKho.trang_thai.in_(_ACTIVE_ALERT_STATUSES)
    )
    rows = db.query(ProactiveInsight).filter(
        ProactiveInsight.scenario.in_(scenarios),
        ProactiveInsight.trang_thai.in_(_OPEN_INSIGHT_STATUSES),
        (
            ~ProactiveInsight.source_alert_id.in_(active_ids)
            | ~ProactiveInsight.source_alert_id.in_(current_alert_ids or {-1})
        ),
    ).all()
    for row in rows:
        row.trang_thai = "superseded"
        row.ngay_thay_the = datetime.now()
    return len(rows)


def refresh_proactive_insights(
    db: Session,
    *,
    scenarios: frozenset[str] = frozenset({PROACTIVE_SCENARIO, PRODUCT_STOCK_SCENARIO}),
) -> dict[str, Any]:
    """Persist current expiry and catalog stock recommendations."""
    alert_service = AlertService()
    candidates: list[dict[str, Any]] = []
    if PROACTIVE_SCENARIO in scenarios:
        for alert_type in sorted(_EXPIRY_ALERT_TYPES):
            candidates.extend(alert_service.list_alerts(
                db,
                loai_canh_bao=alert_type,
                muc_do="cao",
                trang_thai="chua_xu_ly",
                limit=200,
            ))
        candidates = [alert for alert in candidates if is_current_high_expiry_alert(alert)]
    if PRODUCT_STOCK_SCENARIO in scenarios:
        stock_candidates = alert_service.list_alerts(
            db,
            loai_canh_bao=PRODUCT_STOCK_ALERT_TYPE,
            trang_thai="chua_xu_ly",
            limit=10,
        )
        candidates.extend(
            alert for alert in stock_candidates
            if (alert.get("chi_tiet_ton_kho_san_pham") or {}).get("products")
        )

    created = 0
    reopened = 0
    skipped = 0
    failed = 0
    proposed = 0
    superseded = _supersede_noncurrent_insights(
        db,
        {int(alert["canhbao_id"]) for alert in candidates},
        scenarios,
    )
    for alert in candidates:
        condition = build_alert_condition(alert)
        scenario = str(condition.get("scenario") or PROACTIVE_SCENARIO)
        prompt_version = (
            PRODUCT_STOCK_PROMPT_VERSION if scenario == PRODUCT_STOCK_SCENARIO else PROACTIVE_PROMPT_VERSION
        )
        fingerprint = insight_fingerprint(condition)
        existing = db.query(ProactiveInsight).filter(ProactiveInsight.fingerprint == fingerprint).first()
        reopen_token = None
        if existing:
            if existing.trang_thai == "superseded":
                reopen_token = existing.ngay_thay_the.isoformat() if existing.ngay_thay_the else "superseded"
            else:
                skipped += 1
                continue

        # A materially changed condition for the same alert supersedes only
        # open notifications; a human-resolved insight stays an audit record.
        old_open = db.query(ProactiveInsight).filter(
            ProactiveInsight.source_alert_id == condition["alert_id"],
            ProactiveInsight.trang_thai.in_(_OPEN_INSIGHT_STATUSES),
        ).all()

        recommendation, trace, used_llm, trace_id = _run_llm_evaluation(db, condition)
        if scenario == PRODUCT_STOCK_SCENARIO:
            title = f"{condition['product_count']} sản phẩm cần bổ sung hàng"
        else:
            title = f"Hạn dùng cần xử lý: {condition.get('product') or condition.get('batch_code') or condition['alert_id']}"
        automation = agent_service.execute_automated_action(
            db,
            "create_proactive_notification",
            {
                "source_alert_id": condition["alert_id"],
                "fingerprint": fingerprint,
                "scenario": scenario,
                "severity": condition["severity"],
                "title": title,
                "recommendation": recommendation,
                "evidence": condition,
                "tool_trace": trace,
                "prompt_version": prompt_version,
                "model": PROACTIVE_MODEL if used_llm else None,
                "used_llm": used_llm,
                "reopen_existing": reopen_token is not None,
            },
            idempotency_key=automation_idempotency_key(condition, occurrence=reopen_token),
            trigger_context={
                "source": "inventory_alert",
                "scenario": scenario,
                "source_alert_id": condition["alert_id"],
            },
            reasoning_reference=f"prompt={prompt_version};fingerprint={fingerprint}",
            ly_do=recommendation,
            langfuse_trace_id=trace_id,
            preconditions=condition,
        )
        if automation["pending"]:
            proposed += 1
            continue
        if not automation["executed"]:
            failed += 1
            continue

        action_result = automation.get("result") or {}
        if action_result.get("reopened"):
            reopened += 1
        elif action_result.get("created"):
            created += 1
            for row in old_open:
                row.trang_thai = "superseded"
                row.ngay_thay_the = datetime.now()
                superseded += 1
        else:
            skipped += 1

    db.commit()
    return {
        "created": created,
        "reopened": reopened,
        "skipped": skipped,
        "superseded": superseded,
        "proposed": proposed,
        "failed": failed,
    }


def refresh_expiring_batch_insights(db: Session) -> dict[str, Any]:
    """Refresh only the original expiring-batch proactive scenario."""
    return refresh_proactive_insights(db, scenarios=frozenset({PROACTIVE_SCENARIO}))


def safe_refresh_expiring_batch_insights(db: Session) -> dict[str, Any]:
    """Best-effort wrapper for the original expiring-batch scenario."""
    try:
        return refresh_expiring_batch_insights(db)
    except Exception as exc:
        db.rollback()
        logger.exception("Proactive expiry insight refresh failed")
        return {
            "created": 0,
            "reopened": 0,
            "skipped": 0,
            "superseded": 0,
            "proposed": 0,
            "failed": 1,
            "error": type(exc).__name__,
        }


def safe_refresh_proactive_insights(db: Session) -> dict[str, Any]:
    """Best-effort refresh across every registered proactive scenario."""
    try:
        return refresh_proactive_insights(db)
    except Exception as exc:
        db.rollback()
        logger.exception("Proactive insight refresh failed")
        return {
            "created": 0,
            "reopened": 0,
            "skipped": 0,
            "superseded": 0,
            "proposed": 0,
            "failed": 1,
            "error": type(exc).__name__,
        }


def list_proactive_insights(
    db: Session,
    trang_thai: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> dict[str, Any]:
    limit = max(1, min(limit, 200))
    query = db.query(ProactiveInsight)
    if trang_thai:
        query = query.filter(ProactiveInsight.trang_thai == trang_thai)
    total = query.count()
    priority = case(
        (ProactiveInsight.trang_thai == "unread", 0),
        (ProactiveInsight.trang_thai == "read", 1),
        (ProactiveInsight.trang_thai == "resolved", 2),
        else_=3,
    )
    rows = query.order_by(priority, ProactiveInsight.ngay_tao.desc(), ProactiveInsight.insight_id.desc()).offset(skip).limit(limit).all()
    return {"items": [_serialize_insight(row) for row in rows], "total": total, "skip": skip, "limit": limit}


def proactive_insight_summary(db: Session) -> dict[str, int]:
    rows = db.query(ProactiveInsight.trang_thai).all()
    counts = {"unread": 0, "read": 0, "resolved": 0, "superseded": 0}
    for (status,) in rows:
        if status in counts:
            counts[status] += 1
    return counts


def update_proactive_insight_status(db: Session, insight_id: int, trang_thai: str) -> dict[str, Any]:
    if trang_thai not in {"read", "resolved"}:
        raise DomainError(status_code=400, detail="Chỉ có thể đánh dấu insight là read hoặc resolved")
    insight = db.query(ProactiveInsight).filter(ProactiveInsight.insight_id == insight_id).first()
    if not insight:
        raise DomainError(status_code=404, detail="Không tìm thấy proactive insight")
    if insight.trang_thai == "superseded":
        raise DomainError(status_code=409, detail="Insight này đã bị thay thế bởi điều kiện mới hơn")

    insight.trang_thai = trang_thai
    if trang_thai == "read" and insight.ngay_doc is None:
        insight.ngay_doc = datetime.now()
    if trang_thai == "resolved":
        insight.ngay_xu_ly = datetime.now()
    db.commit()
    db.refresh(insight)
    return _serialize_insight(insight)


def _serialize_insight(insight: ProactiveInsight) -> dict[str, Any]:
    return {
        "insight_id": insight.insight_id,
        "source_alert_id": insight.source_alert_id,
        "scenario": insight.scenario,
        "severity": insight.muc_do_nghiem_trong,
        "title": insight.tieu_de,
        "recommendation": insight.khuyen_nghi,
        "evidence": insight.bang_chung,
        "tool_trace": insight.tool_trace,
        "prompt_version": insight.prompt_version,
        "model": insight.model,
        "used_llm": insight.used_llm,
        "status": insight.trang_thai,
        "created_at": insight.ngay_tao,
        "read_at": insight.ngay_doc,
        "resolved_at": insight.ngay_xu_ly,
        "superseded_at": insight.ngay_thay_the,
    }
