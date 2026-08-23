"""Operations Agent router: business-state snapshot, proactive insights,
chat, and the propose -> approve/reject action lifecycle.

Thin by design — see app.services.agent for the business logic. Every
"draft"/"execute" tool call goes through AgentAction (propose, then a
separate approve) so nothing the agent recommends executes without a
human decision; "read" tools (and read-only chat questions) run directly.

Approve/reject role requirements below are intentionally the widest tier
(admin/manager/staff) — the actual, tighter check (draft needs
admin/manager/staff, execute needs admin/manager) happens inside
agent_service.approve_action/reject_action once the target action's tool
classification is known, since the router dependency runs before the
action_id in the path is resolved to anything. See
agent_service._require_role_for_classification.
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..core.capabilities import require_capability
from ..db import get_db
from ..models import NguoiDung
from ..services.agent import (
    DomainError,
    approve_action,
    build_snapshot,
    chat as agent_chat,
    describe_tools,
    get_insights,
    list_actions,
    propose_action,
    reject_action,
    reset_action,
)
from ..services.agent.proactive_service import (
    list_proactive_insights,
    proactive_insight_summary,
    update_proactive_insight_status,
)

router = APIRouter(prefix="/agent", tags=["agent"])


def _raise_http(exc: DomainError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)


# =========================================================
# Request Schemas
# =========================================================
class ChatRequest(BaseModel):
    # Hard caps at the API boundary — app.services.agent.agent_service also
    # trims defensively (message/history length) so `chat()` stays safe
    # even when called directly, but rejecting oversized requests here
    # gives the client an immediate 422 instead of a silently-truncated
    # message.
    message: str = Field(min_length=1, max_length=4000)
    history: Optional[List[Dict[str, Any]]] = Field(default=None, max_length=40)
    session_id: Optional[str] = Field(default=None, min_length=1, max_length=200)


class ProposeActionRequest(BaseModel):
    loai_hanh_dong: str = Field(max_length=50)
    tham_so: Dict[str, Any] = {}
    ly_do: Optional[str] = Field(default=None, max_length=1000)


class RejectActionRequest(BaseModel):
    note: Optional[str] = Field(default=None, max_length=1000)


class ProactiveInsightStatusRequest(BaseModel):
    # unread is system-created, superseded is system-created. An admin can
    # only acknowledge an insight or mark its recommendation handled.
    trang_thai: str = Field(pattern="^(read|resolved)$")


# =========================================================
# GET /agent/state — raw business-state snapshot
# =========================================================
@router.get("/state")
def get_state(
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("agent.chat")),
):
    return build_snapshot(db).to_dict()


# =========================================================
# GET /agent/insights — proactive, prioritized issue list
# =========================================================
@router.get("/insights")
def get_agent_insights(
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("agent.chat")),
):
    return {"insights": get_insights(db)}


# =========================================================
# Proactive insights — durable notification/recommendation lifecycle
# =========================================================
@router.get("/proactive-insights")
def get_proactive_insights(
    trang_thai: Optional[str] = Query(None, pattern="^(unread|read|resolved|superseded)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("agent.chat")),
):
    return list_proactive_insights(db, trang_thai=trang_thai, skip=skip, limit=limit)


@router.get("/proactive-insights/summary")
def get_proactive_insight_summary(
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("agent.chat")),
):
    return proactive_insight_summary(db)


@router.patch("/proactive-insights/{insight_id}")
def patch_proactive_insight(
    insight_id: int,
    payload: ProactiveInsightStatusRequest,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("agent.chat")),
):
    try:
        return update_proactive_insight_status(db, insight_id, payload.trang_thai)
    except DomainError as exc:
        _raise_http(exc)


# =========================================================
# GET /agent/tools — governed tool catalogue
# =========================================================
@router.get("/tools")
def get_tools(
    current_user: NguoiDung = Depends(require_capability("agent.chat")),
):
    return {"tools": describe_tools()}


# =========================================================
# POST /agent/chat — ask the agent
# =========================================================
@router.post("/chat")
def post_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("agent.chat")),
):
    return agent_chat(db, payload.message, current_user, payload.history, payload.session_id)


# =========================================================
# POST /agent/actions — propose a tool call (read-only tools execute now)
# =========================================================
@router.post("/actions")
def post_propose_action(
    payload: ProposeActionRequest,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("agent.action.draft")),
):
    try:
        return propose_action(
            db, payload.loai_hanh_dong, payload.tham_so, current_user, ly_do=payload.ly_do
        )
    except DomainError as exc:
        _raise_http(exc)


# =========================================================
# GET /agent/actions — audit log / pending queue
# =========================================================
@router.get("/actions")
def get_actions(
    trang_thai: Optional[str] = Query(None, description="Filter: de_xuat, dang_xu_ly, hoan_thanh, tu_choi, that_bai"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("agent.chat")),
):
    return list_actions(db, trang_thai=trang_thai, skip=skip, limit=limit)


# =========================================================
# POST /agent/actions/{id}/approve — execute a pending mutating action
# =========================================================
@router.post("/actions/{action_id}/approve")
def post_approve_action(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("agent.action.approve")),
):
    try:
        return approve_action(db, action_id, current_user)
    except DomainError as exc:
        _raise_http(exc)


# =========================================================
# POST /agent/actions/{id}/reject — decline a pending action
# =========================================================
@router.post("/actions/{action_id}/reject")
def post_reject_action(
    action_id: int,
    payload: RejectActionRequest,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("agent.action.approve")),
):
    try:
        return reject_action(db, action_id, current_user, note=payload.note)
    except DomainError as exc:
        _raise_http(exc)


@router.post("/actions/{action_id}/reset")
def post_reset_action(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("agent.action.execute")),
):
    try:
        return reset_action(db, action_id, current_user)
    except DomainError as exc:
        _raise_http(exc)
