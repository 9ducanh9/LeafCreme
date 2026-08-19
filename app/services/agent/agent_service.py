"""Operations Agent core: turns a business-state snapshot into proactive
insights, and runs the propose -> approve -> execute lifecycle for
governed mutating actions.

Two reasoning paths:
  - Deterministic rule engine (`get_insights`) — always available, no
    external dependency. Walks the snapshot and flags what a human
    operator would flag: unresolved high-severity alerts, orders stuck
    past a threshold, expired batches sitting on shelves.
  - LLM chat (`chat`) — if ANTHROPIC_API_KEY is configured, runs a real
    tool-use loop against Claude (see `_run_agent_loop`): the model picks
    which read tools to call, can chain several in sequence to gather
    what it needs, and answers from what those tools actually returned
    instead of a value baked into the prompt. Without a key it falls back
    to a template built from `get_insights`, so the endpoint always works.

Nothing in here mutates data on its own — including inside the chat loop.
`get_insights` only *recommends* a tool call, and when the chat loop's
model calls a mutating ("thay_doi") tool, that call is routed through
`propose_action` rather than `AgentTool.execute` (see
`_execute_tool_call` below) — it becomes a pending AgentAction, not an
executed one. A recommendation or a chat-proposed action only takes
effect once a human calls `approve_action`, which is the one place
`AgentTool.execute` runs for a mutating tool.
"""
import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.models import AgentAction, NguoiDung
from app.services.agent import state_service, tools as tool_registry
from app.services.errors import DomainError

logger = logging.getLogger("bakeryonl.agent")

CHAT_MODEL = "claude-sonnet-5"
MAX_TOOL_ITERATIONS = 6
# Bounds on what gets sent to the model per chat call — without these, a
# long-running conversation keeps resending its entire history on every
# turn, growing latency/cost without limit and eventually exceeding the
# model's context window.
MAX_HISTORY_MESSAGES = 20
MAX_MESSAGE_CHARS = 4000


@dataclass(frozen=True)
class Insight:
    id: str
    title: str
    severity: str  # "cao" | "binh_thuong" | "thap"
    category: str
    description: str
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
        insights.append(
            Insight(
                id=f"alert:{alert['canhbao_id']}",
                title=f"{label}: {product}",
                severity=severity,
                category="inventory",
                description=(
                    f"{label} on '{product}' (lot {alert.get('ma_lo') or '?'}), "
                    f"currently {alert.get('so_luong_hien_tai')} units on hand."
                ),
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
    codes = ", ".join(o["ma_don_hang"] for o in stale_orders[:5])
    return Insight(
        id="stale_orders",
        title=f"{stale_order_count} order(s) stuck for 24h+",
        severity=severity,
        category="orders",
        description=(
            f"{stale_order_count} order(s) have been sitting in cho/cho_coc/dang_xu_ly for over 24 hours "
            f"without moving forward: {codes}{'…' if stale_order_count > 5 else ''}. "
            "Review for fulfillment or payment issues."
        ),
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
# Action lifecycle: propose (or execute immediately if read-only) -> approve
# ---------------------------------------------------------------------------
def _serialize_action(action: AgentAction) -> dict:
    return {
        "action_id": action.action_id,
        "loai_hanh_dong": action.loai_hanh_dong,
        "tham_so": action.tham_so,
        "ly_do": action.ly_do,
        "nguon": action.nguon,
        "muc_do_rui_ro": action.muc_do_rui_ro,
        "trang_thai": action.trang_thai,
        "ket_qua": action.ket_qua,
        "loi": action.loi,
        "nguoidung_de_xuat_id": action.nguoidung_de_xuat_id,
        "nguoidung_duyet_id": action.nguoidung_duyet_id,
        "ngay_tao": action.ngay_tao,
        "ngay_xu_ly": action.ngay_xu_ly,
    }


def propose_action(
    db: Session,
    loai_hanh_dong: str,
    tham_so: dict,
    current_user: NguoiDung,
    ly_do: Optional[str] = None,
    nguon: str = "nhan_vien",
) -> dict:
    """Validates a requested tool call. Read-only tools run immediately
    (nothing to approve). Mutating tools are persisted as a pending
    AgentAction — recording who proposed it — and require `approve_action`
    before `execute` ever runs.
    """
    tool = tool_registry.get_tool(loai_hanh_dong)
    tool_registry.validate_params(tool, tham_so)

    if tool.risk == "doc":
        result = tool.execute(db, tham_so, current_user)
        return {"executed": True, "pending": False, "result": result}

    action = AgentAction(
        loai_hanh_dong=loai_hanh_dong,
        tham_so=jsonable_encoder(tham_so),
        ly_do=ly_do,
        nguon=nguon,
        muc_do_rui_ro=tool.risk,
        trang_thai="de_xuat",
        nguoidung_de_xuat_id=current_user.nguoidung_id,
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
    BatchService.update_batch, ...) calls `db.commit()` internally as part
    of its normal operation, which would release a held row lock *before*
    `approve_action` gets to mark the action done — so holding a lock
    across the call to `tool.execute()` doesn't work here. A single
    `UPDATE ... WHERE trang_thai = 'de_xuat'`, committed right away and
    checked for `rowcount`, is atomic regardless of what happens inside
    the tool call: only one concurrent caller's UPDATE can match the row
    while it's still "de_xuat", and the loser's `rowcount` comes back 0.
    """
    claimed = (
        db.query(AgentAction)
        .filter(AgentAction.action_id == action_id, AgentAction.trang_thai == "de_xuat")
        .update(
            {
                "trang_thai": claimed_trang_thai,
                "nguoidung_duyet_id": current_user.nguoidung_id,
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


def approve_action(db: Session, action_id: int, current_user: NguoiDung) -> dict:
    action = _claim_action_or_404(db, action_id, "dang_xu_ly", current_user)

    tool = tool_registry.get_tool(action.loai_hanh_dong)
    try:
        result = tool.execute(db, action.tham_so, current_user)
    except DomainError as exc:
        action.trang_thai = "that_bai"
        action.loi = exc.detail
        action.ngay_xu_ly = datetime.now()
        db.commit()
        raise
    except Exception:
        logger.exception("Operations Agent action %s failed during execution", action_id)
        action.trang_thai = "that_bai"
        action.loi = "Đã xảy ra lỗi không mong đợi khi thực thi hành động"
        action.ngay_xu_ly = datetime.now()
        db.commit()
        raise DomainError(status_code=500, detail="Đã xảy ra lỗi không mong đợi khi thực thi hành động")

    action.trang_thai = "hoan_thanh"
    action.ket_qua = jsonable_encoder(result)
    action.ngay_xu_ly = datetime.now()
    db.commit()
    db.refresh(action)
    return _serialize_action(action)


def reject_action(db: Session, action_id: int, current_user: NguoiDung, note: Optional[str] = None) -> dict:
    action = _claim_action_or_404(db, action_id, "tu_choi", current_user)
    action.loi = note
    action.ngay_xu_ly = datetime.now()
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
# Chat: a real tool-use loop against Claude when configured, deterministic
# fallback otherwise
# ---------------------------------------------------------------------------
def _fallback_reply(insights: list[dict], message: str) -> str:
    if not insights or insights[0]["id"] == "all_clear":
        return "No open operational issues right now — alerts are clear and no orders are stuck."

    lines = ["Here's what needs attention right now:"]
    for insight in insights[:5]:
        lines.append(f"- [{insight['severity']}] {insight['title']}: {insight['description']}")
    return "\n".join(lines)


_SYSTEM_PROMPT = (
    "You are the Leaf Creme Operations Agent, helping bakery staff run day-to-day "
    "operations. You have read tools to look up live inventory alerts and stuck "
    "orders, and action tools to resolve/dismiss alerts, regenerate alerts, and "
    "change a batch's status.\n\n"
    "Use the read tools to gather whatever current data you need before answering — "
    "don't guess at numbers you haven't looked up. Call more than one tool in "
    "sequence when the question needs it (e.g. check alert summary AND stale "
    "orders before giving a general status update).\n\n"
    "You never execute a mutating action yourself: calling a mutating tool only "
    "queues it as a pending proposal that a manager approves separately elsewhere "
    "in the app. When you call one, tell the user what you proposed and that it's "
    "awaiting approval — don't claim it's done.\n\n"
    "Be concise and concrete, and cite the actual numbers the tools return."
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
    return real data. Mutating tools are never executed here — they go
    through `propose_action`, which only ever creates a pending
    AgentAction row; see module docstring."""
    tool = tool_registry.get_tool(tool_name)
    tool_registry.validate_params(tool, tool_input)

    if tool.risk == "doc":
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
        "note": "This is a mutating action — it has been queued for a manager to approve, not executed.",
    }


def _run_agent_loop(
    client: Any, db: Session, current_user: NguoiDung, message: str, history: list[dict]
) -> tuple[str, list[dict], list[dict]]:
    """The actual agentic loop: send the conversation + tool schemas to
    Claude, execute whatever tools it asks for, feed the results back, and
    repeat until it stops asking for tools (or MAX_TOOL_ITERATIONS is hit).
    This is what lets the model chain several read calls — e.g. check
    alerts, then check stale orders, then answer — instead of answering
    off a single pre-baked snapshot.
    """
    messages: list[dict] = [*history, {"role": "user", "content": message}]
    tools_schema = tool_registry.anthropic_tool_schemas()
    proposed_actions: list[dict] = []
    tool_trace: list[dict] = []

    for _ in range(MAX_TOOL_ITERATIONS):
        response = client.messages.create(
            model=CHAT_MODEL,
            max_tokens=1024,
            system=_SYSTEM_PROMPT,
            tools=tools_schema,
            messages=messages,
        )

        if response.stop_reason != "tool_use":
            text = "".join(block.text for block in response.content if getattr(block, "type", None) == "text")
            return text, proposed_actions, tool_trace

        messages.append({"role": "assistant", "content": response.content})
        tool_results = []
        for block in response.content:
            if getattr(block, "type", None) != "tool_use":
                continue
            try:
                output = _execute_tool_call(db, block.name, block.input, current_user, proposed_actions, tool_trace)
                tool_results.append({
                    "type": "tool_result", "tool_use_id": block.id,
                    "content": json.dumps(output, default=str),
                })
            except DomainError as exc:
                tool_results.append({
                    "type": "tool_result", "tool_use_id": block.id,
                    "content": json.dumps({"error": exc.detail}), "is_error": True,
                })
        messages.append({"role": "user", "content": tool_results})

    return (
        "I hit the tool-call limit while investigating this — here's what I found before stopping.",
        proposed_actions,
        tool_trace,
    )


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

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            reply, proposed_actions, tool_trace = _run_agent_loop(client, db, current_user, message, history)
            return {
                "reply": reply,
                "used_llm": True,
                "insights": get_insights(db),
                "proposed_actions": proposed_actions,
                "tool_calls": tool_trace,
            }
        except ImportError:
            logger.warning("ANTHROPIC_API_KEY set but the anthropic package isn't installed; falling back")
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
