"""Operations Agent core: turns a business-state snapshot into proactive
insights, and runs the propose -> approve -> execute lifecycle for
governed actions.

Two reasoning paths:
  - Deterministic rule engine (`get_insights`) — always available, no
    external dependency. Walks the snapshot and flags what a human
    operator would flag: unresolved high-severity alerts, orders stuck
    past a threshold, expired batches sitting on shelves.
  - LLM chat (`chat`) — if DEEPSEEK_API_KEY is configured, runs a real
    tool-use loop against DeepSeek (see `_run_agent_loop`) via its
    OpenAI-compatible chat-completions API: the model picks which read
    tools to call, can chain several in sequence to gather what it needs,
    and answers from what those tools actually returned instead of a
    value baked into the prompt. Without a key it falls back to a
    template built from `get_insights`, clearly labeled as reduced
    capability, so the endpoint always works.

Nothing in here mutates data on its own — including inside the chat loop.
`get_insights` only *recommends* a tool call, and when the chat loop's
model calls a "draft" or "execute" tool, that call is routed through
`propose_action` rather than `AgentTool.execute` (see
`_execute_tool_call` below) — it becomes a pending AgentAction, not an
executed one. A recommendation or a chat-proposed action only takes
effect once a human calls `approve_action`, which:
  1. checks the caller's role against the tool's classification
     (`_require_role_for_classification`),
  2. atomically claims the action so two concurrent approvals can't both
     execute it (`_claim_action_or_404`),
  3. re-validates the tool's captured preconditions against live state, if
     it declared any, so an approval can't fire against a target that
     changed since the proposal was made (stale-approval guard), and only
     then
  4. runs `AgentTool.execute` — the one place a mutation actually happens.
"""
import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Optional

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.models import AgentAction, NguoiDung
from app.services.agent import observability, state_service, tools as tool_registry
from app.services.errors import DomainError
from app.core.time import utc_now

logger = logging.getLogger("bakeryonl.agent")

CHAT_MODEL = "deepseek-chat"
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
MAX_TOOL_ITERATIONS = 6
# Bounds on what gets sent to the model per chat call — without these, a
# long-running conversation keeps resending its entire history on every
# turn, growing latency/cost without limit and eventually exceeding the
# model's context window.
MAX_HISTORY_MESSAGES = 20
MAX_MESSAGE_CHARS = 4000
STALE_ACTION_MINUTES = max(1, int(os.getenv("AGENT_ACTION_STALE_MINUTES", "15")))

# Which roles may approve/reject an action of a given tool classification.
# "read" never reaches this (propose_action executes it immediately), so
# it has no entry — anything not in this map falls back to the strictest
# tier (admin/manager only).
_APPROVAL_ROLE_TIERS: dict[str, tuple[str, ...]] = {
    "draft": ("admin", "manager", "staff"),
    "execute": ("admin", "manager"),
}


@dataclass(frozen=True)
class Insight:
    id: str
    title: str
    severity: str  # "cao" | "binh_thuong" | "thap"
    category: str
    description: str
    # Concrete, already-real data points backing the claim (units on
    # hand, lot code, hours stuck, ...) — kept separate from `description`
    # so the UI/LLM can show "why we're saying this" without the agent
    # inventing metrics Leaf Crème doesn't have (waste %, revenue impact,
    # sales velocity — none of that data exists; see agent V2 plan).
    evidence: list[str] = field(default_factory=list)
    recommended_tool: Optional[str] = None
    recommended_params: Optional[dict] = None
    rationale: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "severity": self.severity,
            "category": self.category,
            "description": self.description,
            "evidence": self.evidence,
            "recommended_action": (
                {
                    "tool": self.recommended_tool,
                    "params": self.recommended_params,
                    "rationale": self.rationale,
                }
                if self.recommended_tool
                else None
            ),
        }


_ALERT_TYPE_LABELS = {
    "ton_kho_thap": "Low stock",
    "sap_het_han": "Expiring soon",
    "het_han": "Expired",
    "qua_han": "Past due",
}


def _insights_from_alerts(urgent_alerts: list[dict]) -> list[Insight]:
    insights = []
    for alert in urgent_alerts:
        label = _ALERT_TYPE_LABELS.get(alert["loai_canh_bao"], alert["loai_canh_bao"])
        product = alert.get("ten_san_pham") or f"batch #{alert.get('lohang_id')}"
        severity = alert["muc_do_nghiem_trong"]

        evidence = []
        if alert.get("so_luong_hien_tai") is not None:
            evidence.append(f"{alert['so_luong_hien_tai']} units on hand")
        if alert.get("ma_lo"):
            evidence.append(f"lot {alert['ma_lo']}")
        if alert.get("ngay_het_han"):
            evidence.append(f"expiry date {alert['ngay_het_han']}")

        insights.append(
            Insight(
                id=f"alert:{alert['canhbao_id']}",
                title=f"{label}: {product}",
                severity=severity,
                category="inventory",
                description=f"{label} on '{product}'.",
                evidence=evidence,
                recommended_tool="resolve_alert" if severity == "cao" else None,
                recommended_params={"alert_id": alert["canhbao_id"]} if severity == "cao" else None,
                rationale="High-severity alert — resolve once restocked or the batch is discarded." if severity == "cao" else None,
            )
        )
    return insights


def _insight_from_stale_orders(stale_orders: list[dict], stale_order_count: int) -> Optional[Insight]:
    if stale_order_count == 0:
        return None
    severity = "cao" if stale_order_count >= 5 else "binh_thuong"
    evidence = [f"{o['ma_don_hang']} — {o['hours_open']}h open" for o in stale_orders[:5]]
    return Insight(
        id="stale_orders",
        title=f"{stale_order_count} order(s) stuck for 24h+",
        severity=severity,
        category="orders",
        description="Orders have been sitting without moving forward — review for fulfillment or payment issues.",
        evidence=evidence,
    )


def get_insights(db: Session) -> list[dict]:
    snapshot = state_service.build_snapshot(db)
    insights = _insights_from_alerts(snapshot.urgent_alerts)
    stale_insight = _insight_from_stale_orders(snapshot.stale_orders, snapshot.stale_order_count)
    if stale_insight:
        insights.append(stale_insight)

    if not insights:
        insights.append(
            Insight(
                id="all_clear",
                title="No open issues detected",
                severity="thap",
                category="general",
                description="No unresolved high-severity alerts and no orders stuck past the 24h threshold.",
            )
        )

    severity_rank = {"cao": 0, "binh_thuong": 1, "thap": 2}
    insights.sort(key=lambda i: severity_rank.get(i.severity, 3))
    return [i.to_dict() for i in insights]


# ---------------------------------------------------------------------------
# Action lifecycle: propose (read runs immediately) -> approve/reject
# ---------------------------------------------------------------------------
def _serialize_action(action: AgentAction) -> dict:
    started = action.ngay_bat_dau_xu_ly
    is_stale = bool(
        action.trang_thai == "dang_xu_ly"
        and started is not None
        and (utc_now() - started).total_seconds() >= STALE_ACTION_MINUTES * 60
    )
    return {
        "action_id": action.action_id,
        "loai_hanh_dong": action.loai_hanh_dong,
        "tham_so": action.tham_so,
        "ly_do": action.ly_do,
        "nguon": action.nguon,
        "phan_loai": action.phan_loai,
        "muc_do_uu_tien": action.muc_do_uu_tien,
        "trang_thai": action.trang_thai,
        "dieu_kien_tien_quyet": action.dieu_kien_tien_quyet,
        "ket_qua": action.ket_qua,
        "loi": action.loi,
        "nguoidung_de_xuat_id": action.nguoidung_de_xuat_id,
        "nguoidung_duyet_id": action.nguoidung_duyet_id,
        "ngay_tao": action.ngay_tao,
        "ngay_bat_dau_xu_ly": action.ngay_bat_dau_xu_ly,
        "ngay_xu_ly": action.ngay_xu_ly,
        "nguoidung_reset_id": action.nguoidung_reset_id,
        "ngay_reset": action.ngay_reset,
        "is_stale": is_stale,
    }


def _require_role_for_classification(current_user: NguoiDung, classification: str, verb: str) -> None:
    allowed = _APPROVAL_ROLE_TIERS.get(classification, ("admin", "manager"))
    vaitro_ten = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
    if vaitro_ten not in allowed:
        raise DomainError(
            status_code=403,
            detail=(
                f"Bạn không có quyền {verb} hành động loại '{classification}'. "
                f"Yêu cầu vai trò: {', '.join(allowed)}."
            ),
        )


def propose_action(
    db: Session,
    loai_hanh_dong: str,
    tham_so: dict,
    current_user: NguoiDung,
    ly_do: Optional[str] = None,
    nguon: str = "nhan_vien",
) -> dict:
    """Validates a requested tool call. "read" tools run immediately
    (nothing to approve). "draft"/"execute" tools are persisted as a
    pending AgentAction — recording who proposed it, and a snapshot of
    the target's live state if the tool declares `capture_state` — and
    require `approve_action` before `execute` ever runs.
    """
    tool = tool_registry.get_tool(loai_hanh_dong)
    tool_registry.validate_params(tool, tham_so)

    if tool.classification == "read":
        result = tool.execute(db, tham_so, current_user)
        return {"executed": True, "pending": False, "result": result}

    preconditions = None
    if tool.capture_state:
        preconditions = jsonable_encoder(tool.capture_state(db, tham_so, current_user))

    action = AgentAction(
        loai_hanh_dong=loai_hanh_dong,
        tham_so=jsonable_encoder(tham_so),
        ly_do=ly_do,
        nguon=nguon,
        phan_loai=tool.classification,
        muc_do_uu_tien=tool.risk_level,
        trang_thai="de_xuat",
        nguoidung_de_xuat_id=current_user.nguoidung_id,
        dieu_kien_tien_quyet=preconditions,
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return {"executed": False, "pending": True, "action": _serialize_action(action)}


def _claim_action_or_404(db: Session, action_id: int, claimed_trang_thai: str, current_user: NguoiDung) -> AgentAction:
    """Atomically transitions a "de_xuat" row to `claimed_trang_thai`,
    committing immediately, and returns the freshly-claimed row.

    This — not a `SELECT ... FOR UPDATE` lock — is what actually prevents
    two managers approving (or one approving and one rejecting) the same
    action within milliseconds of each other from both succeeding: every
    AgentTool's own service method (AlertService.update_alert,
    BatchService.update_batch, OrderService.cancel_order, ...) calls
    `db.commit()` internally as part of its normal operation, which would
    release a held row lock *before* `approve_action` gets to mark the
    action done — so holding a lock across the call to `tool.execute()`
    doesn't work here. A single `UPDATE ... WHERE trang_thai = 'de_xuat'`,
    committed right away and checked for `rowcount`, is atomic regardless
    of what happens inside the tool call: only one concurrent caller's
    UPDATE can match the row while it's still "de_xuat", and the loser's
    `rowcount` comes back 0.
    """
    claimed = (
        db.query(AgentAction)
        .filter(AgentAction.action_id == action_id, AgentAction.trang_thai == "de_xuat")
        .update(
            {
                "trang_thai": claimed_trang_thai,
                "nguoidung_duyet_id": current_user.nguoidung_id,
                "ngay_bat_dau_xu_ly": utc_now() if claimed_trang_thai == "dang_xu_ly" else None,
            },
            synchronize_session=False,
        )
    )
    db.commit()

    if claimed == 0:
        action = db.query(AgentAction).filter(AgentAction.action_id == action_id).first()
        if not action:
            raise DomainError(status_code=404, detail="Không tìm thấy đề xuất hành động")
        verb = "duyệt" if claimed_trang_thai == "dang_xu_ly" else "từ chối"
        raise DomainError(status_code=400, detail=f"Hành động đã ở trạng thái '{action.trang_thai}', không thể {verb} lại")

    return db.query(AgentAction).filter(AgentAction.action_id == action_id).first()


def _get_action_and_tool_or_404(db: Session, action_id: int) -> tuple[AgentAction, tool_registry.AgentTool]:
    action = db.query(AgentAction).filter(AgentAction.action_id == action_id).first()
    if not action:
        raise DomainError(status_code=404, detail="Không tìm thấy đề xuất hành động")
    return action, tool_registry.get_tool(action.loai_hanh_dong)


def approve_action(db: Session, action_id: int, current_user: NguoiDung) -> dict:
    _, tool = _get_action_and_tool_or_404(db, action_id)
    _require_role_for_classification(current_user, tool.classification, "duyệt")

    action = _claim_action_or_404(db, action_id, "dang_xu_ly", current_user)

    try:
        if tool.revalidate_state and action.dieu_kien_tien_quyet is not None:
            tool.revalidate_state(db, action.tham_so, action.dieu_kien_tien_quyet, current_user)
        result = tool.execute(db, action.tham_so, current_user)
    except DomainError as exc:
        action.trang_thai = "that_bai"
        action.loi = exc.detail
        action.ngay_xu_ly = utc_now()
        db.commit()
        raise
    except Exception:
        logger.exception("Operations Agent action %s failed during execution", action_id)
        action.trang_thai = "that_bai"
        action.loi = "Đã xảy ra lỗi không mong đợi khi thực thi hành động"
        action.ngay_xu_ly = utc_now()
        db.commit()
        raise DomainError(status_code=500, detail="Đã xảy ra lỗi không mong đợi khi thực thi hành động")

    action.trang_thai = "hoan_thanh"
    action.ket_qua = jsonable_encoder(result)
    action.ngay_xu_ly = utc_now()
    db.commit()
    db.refresh(action)
    return _serialize_action(action)


def reject_action(db: Session, action_id: int, current_user: NguoiDung, note: Optional[str] = None) -> dict:
    _, tool = _get_action_and_tool_or_404(db, action_id)
    _require_role_for_classification(current_user, tool.classification, "từ chối")

    action = _claim_action_or_404(db, action_id, "tu_choi", current_user)
    action.loi = note
    action.ngay_xu_ly = utc_now()
    db.commit()
    db.refresh(action)
    return _serialize_action(action)


def reset_action(db: Session, action_id: int, current_user: NguoiDung) -> dict:
    """Return only an old in-flight action to the proposal queue.

    Reset never executes the tool.  Approval must run again, including the
    tool's live precondition validation, because business state may have
    changed while the original process was stuck.
    """
    action, _ = _get_action_and_tool_or_404(db, action_id)
    if action.trang_thai != "dang_xu_ly":
        raise DomainError(status_code=400, detail="Chỉ có hành động đang xử lý mới được reset")
    started = action.ngay_bat_dau_xu_ly
    if started is None or (utc_now() - started).total_seconds() < STALE_ACTION_MINUTES * 60:
        raise DomainError(status_code=400, detail=f"Hành động chưa quá ngưỡng {STALE_ACTION_MINUTES} phút")
    action.trang_thai = "de_xuat"
    action.nguoidung_duyet_id = None
    action.ngay_bat_dau_xu_ly = None
    action.ngay_xu_ly = None
    action.nguoidung_reset_id = current_user.nguoidung_id
    action.ngay_reset = utc_now()
    action.loi = None
    db.commit()
    db.refresh(action)
    return _serialize_action(action)


def list_actions(db: Session, trang_thai: Optional[str] = None, skip: int = 0, limit: int = 50) -> dict:
    limit = max(1, min(limit, 200))
    skip = max(0, skip)
    query = db.query(AgentAction)
    if trang_thai:
        query = query.filter(AgentAction.trang_thai == trang_thai)
    total = query.count()
    rows = query.order_by(AgentAction.ngay_tao.desc(), AgentAction.action_id.desc()).offset(skip).limit(limit).all()
    return {"items": [_serialize_action(a) for a in rows], "total": total, "skip": skip, "limit": limit}


# ---------------------------------------------------------------------------
# Chat: a real tool-use loop against DeepSeek when configured, deterministic
# fallback otherwise
# ---------------------------------------------------------------------------
def _fallback_reply(insights: list[dict], message: str) -> str:
    prefix = "(Chế độ dự phòng — không có kết nối AI / fallback mode, no live AI reasoning)\n"
    if not insights or insights[0]["id"] == "all_clear":
        return prefix + "No open operational issues right now — alerts are clear and no orders are stuck."

    lines = [prefix + "Here's what needs attention right now:"]
    for insight in insights[:5]:
        lines.append(f"- [{insight['severity']}] {insight['title']}: {insight['description']}")
    return "\n".join(lines)


_SYSTEM_PROMPT = (
    "You are the Leaf Creme Operations Agent, helping bakery staff run day-to-day "
    "operations: reviewing alerts and stuck orders, checking whether a gift box can "
    "be assembled, deciding what to reorder, and handling order issues (status "
    "changes, cancellations).\n\n"

    "TOOL USE\n"
    "Use the read tools to gather whatever current data you actually need before "
    "answering — never guess at a number you haven't looked up. Chain multiple "
    "tools when a question needs it: e.g. for a daily brief, check alerts AND "
    "expiring batches AND stale orders; for a production question, get the gift "
    "box's BOM, then check inventory for each ingredient it requires, before "
    "concluding whether it's feasible; for an order question, get the order's "
    "details and its payment status before explaining what an action would do.\n\n"

    "GOVERNANCE\n"
    "You never execute a mutating action yourself. Calling a 'draft' or 'execute' "
    "tool only queues a proposal for a human to approve elsewhere in the app — it "
    "has NOT happened yet. Always tell the user exactly that: what you proposed, "
    "and that it's awaiting approval. Never say an order was cancelled, a batch "
    "was paused, or stock was reordered — say you PROPOSED it.\n\n"

    "HONESTY ABOUT DATA\n"
    "Leaf Crème does not track ingredient-level recipes for baked products (only "
    "gift boxes have a real bill-of-materials) and has no purchase-order system — "
    "a replenishment 'draft' is a recorded recommendation for a human to act on "
    "manually, not a real purchase order. If a tool result says a recipe or metric "
    "isn't available, say so plainly instead of estimating. Never invent numbers "
    "for waste, revenue impact, or sales velocity — Leaf Crème doesn't have that "
    "data.\n\n"

    "LANGUAGE\n"
    "Reply in the same language the user wrote in (Vietnamese in, Vietnamese out; "
    "English in, English out). Never surface raw internal codes (e.g. "
    "'binh_thuong', 'chua_xu_ly', 'ton_kho_thap') — describe them in natural "
    "language instead.\n\n"

    "Be concise and concrete, and cite the actual data the tools return."
)


def _execute_tool_call(
    db: Session,
    tool_name: str,
    tool_input: dict,
    current_user: NguoiDung,
    proposed_actions: list[dict],
    tool_trace: list[dict],
) -> dict:
    """Runs one tool call requested by the model. Read tools execute and
    return real data. Draft/execute tools are never executed here — they
    go through `propose_action`, which only ever creates a pending
    AgentAction row; see module docstring."""
    tool = tool_registry.get_tool(tool_name)
    tool_registry.validate_params(tool, tool_input)

    if tool.classification == "read":
        result = tool.execute(db, tool_input, current_user)
        tool_trace.append({"tool": tool_name, "input": tool_input, "outcome": "executed"})
        return jsonable_encoder(result)

    proposal = propose_action(
        db, tool_name, tool_input, current_user,
        ly_do="Proposed by the Operations Agent during a chat conversation.",
        nguon="agent",
    )
    proposed_actions.append(proposal["action"])
    tool_trace.append({
        "tool": tool_name, "input": tool_input, "outcome": "proposed",
        "action_id": proposal["action"]["action_id"],
    })
    return {
        "status": "proposed_pending_approval",
        "action_id": proposal["action"]["action_id"],
        "note": f"This is a {tool.classification} action — it has been queued for approval, not executed.",
    }


def _run_agent_loop(
    client: Any, db: Session, current_user: NguoiDung, message: str, history: list[dict]
) -> tuple[str, list[dict], list[dict]]:
    """The actual agentic loop: send the conversation + tool schemas to
    DeepSeek (via its OpenAI-compatible chat-completions API), execute
    whatever tools it asks for, feed the results back, and repeat until it
    stops asking for tools (or MAX_TOOL_ITERATIONS is hit). This is what
    lets the model chain several read calls — e.g. check a gift box's BOM,
    then its ingredient inventory, then answer — instead of answering off
    a single pre-baked snapshot.
    """
    messages: list[dict] = [{"role": "system", "content": _SYSTEM_PROMPT}, *history, {"role": "user", "content": message}]
    tools_schema = tool_registry.chat_tool_schemas()
    proposed_actions: list[dict] = []
    tool_trace: list[dict] = []

    with observability.trace_conversation(current_user.nguoidung_id, message) as conv_span:
        for iteration in range(MAX_TOOL_ITERATIONS):
            start = time.monotonic()
            with observability.trace_llm_call(CHAT_MODEL, iteration) as gen:
                response = client.chat.completions.create(
                    model=CHAT_MODEL,
                    max_tokens=1024,
                    tools=tools_schema,
                    messages=messages,
                )
                choice = response.choices[0]
                usage = getattr(response, "usage", None)
                observability.safe_update(
                    gen,
                    output={
                        "content": choice.message.content,
                        "tool_calls": [tc.function.name for tc in (choice.message.tool_calls or [])],
                    },
                    usage_details=(
                        {"input": getattr(usage, "prompt_tokens", None), "output": getattr(usage, "completion_tokens", None)}
                        if usage else None
                    ),
                    metadata={"latency_ms": round((time.monotonic() - start) * 1000)},
                )

            if choice.finish_reason != "tool_calls" or not choice.message.tool_calls:
                text = choice.message.content or ""
                observability.safe_update(conv_span, output=text)
                observability.flush()
                return text, proposed_actions, tool_trace

            messages.append({
                "role": "assistant",
                "content": choice.message.content,
                "tool_calls": [
                    {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in choice.message.tool_calls
                ],
            })
            for tool_call in choice.message.tool_calls:
                try:
                    tool_input = json.loads(tool_call.function.arguments or "{}")
                except json.JSONDecodeError:
                    messages.append({
                        "role": "tool", "tool_call_id": tool_call.id,
                        "content": json.dumps({"error": "Tham số gọi tool không phải JSON hợp lệ."}),
                    })
                    continue

                with observability.trace_tool_call(tool_call.function.name, tool_input) as tool_span:
                    tool_start = time.monotonic()
                    try:
                        output = _execute_tool_call(db, tool_call.function.name, tool_input, current_user, proposed_actions, tool_trace)
                        observability.safe_update(
                            tool_span, output=output,
                            metadata={"latency_ms": round((time.monotonic() - tool_start) * 1000)},
                        )
                        content = json.dumps(output, default=str)
                    except DomainError as exc:
                        observability.safe_update(
                            tool_span, output={"error": exc.detail}, level="ERROR",
                            metadata={"latency_ms": round((time.monotonic() - tool_start) * 1000)},
                        )
                        content = json.dumps({"error": exc.detail})
                messages.append({"role": "tool", "tool_call_id": tool_call.id, "content": content})

        fallback_text = "I hit the tool-call limit while investigating this — here's what I found before stopping."
        observability.safe_update(conv_span, output=fallback_text, level="WARNING")
        observability.flush()
        return fallback_text, proposed_actions, tool_trace


def _truncate_text(text: str, max_chars: int) -> str:
    if not isinstance(text, str) or len(text) <= max_chars:
        return text
    return text[:max_chars] + "…"


def _trim_history(history: list[dict]) -> list[dict]:
    """Caps what gets resent to the model each turn: only the most recent
    MAX_HISTORY_MESSAGES entries, each capped at MAX_MESSAGE_CHARS. Without
    this, a long-running chat resends its full transcript on every turn —
    growing latency/cost per message and eventually exceeding the model's
    context window. Applied here (not just at the API boundary) so `chat`
    stays safe even when called directly, bypassing router validation.
    """
    trimmed = history[-MAX_HISTORY_MESSAGES:]
    return [
        {**entry, "content": _truncate_text(entry.get("content"), MAX_MESSAGE_CHARS)}
        for entry in trimmed
        if entry.get("role") in ("user", "assistant")
    ]


def chat(db: Session, message: str, current_user: NguoiDung, history: Optional[list[dict]] = None) -> dict:
    message = _truncate_text(message, MAX_MESSAGE_CHARS)
    history = _trim_history(history or [])

    api_key = os.getenv("DEEPSEEK_API_KEY")
    if api_key:
        try:
            import openai
            client = openai.OpenAI(api_key=api_key, base_url=os.getenv("DEEPSEEK_BASE_URL") or DEEPSEEK_BASE_URL)
            reply, proposed_actions, tool_trace = _run_agent_loop(client, db, current_user, message, history)
            return {
                "reply": reply,
                "used_llm": True,
                "insights": get_insights(db),
                "proposed_actions": proposed_actions,
                "tool_calls": tool_trace,
            }
        except ImportError:
            logger.warning("DEEPSEEK_API_KEY set but the openai package isn't installed; falling back")
        except Exception:
            logger.exception("Operations Agent tool-use loop failed; falling back to deterministic reply")

    insights = get_insights(db)
    return {
        "reply": _fallback_reply(insights, message),
        "used_llm": False,
        "insights": insights,
        "proposed_actions": [],
        "tool_calls": [],
    }
