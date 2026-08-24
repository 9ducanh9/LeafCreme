"""Governed tool registry for the Operations Agent.

Every action the agent (or a staff member acting through it) can take on
live data is declared here as an `AgentTool` — a name, a classification,
the parameters it accepts, and an `execute` callable that goes through the
*existing* domain services (AlertService, BatchService, OrderService, ...)
rather than touching models directly. That keeps the agent bound to the
same validation, business rules, and authorization a human clicking
through the admin UI would hit — it has no side door. If a domain service
is missing a read method a tool needs, add it to *that* service; agent
tools compose existing domain capabilities, they don't grow new business
logic of their own.

Classification (replaces the earlier ambiguous doc/thay_doi split):
  - "read": no business mutation. Runs immediately, no approval needed.
  - "draft": records a recommendation (e.g. a replenishment note) but has
    no irreversible external effect. Still goes through propose->approve
    so there's an audit trail and a human sign-off, but staff (not just
    admin/manager) may approve it — see
    agent_service._require_role_for_classification.
  - "execute": actually mutates business state (cancels an order, changes
    a batch's status, ...). Requires admin/manager approval.

`risk_level` (low/medium/high) is a separate, optional, human-facing tier
shown in the audit UI — independent of classification (an "execute" can
still be low-risk, e.g. pausing a batch).

`execution_policy` is the code-owned unattended execution boundary:
AUTO_ALLOWED, APPROVAL_REQUIRED, or NEVER_AUTOMATE. The LLM never sets or
overrides it. AUTO_ALLOWED alone is not sufficient for mutation: the
automated executor also requires low risk, idempotency, explicit enablement,
and live-state revalidation.

Stale-approval guard: an "execute" tool may declare `capture_state` (run
at propose time, snapshots whatever live fields matter — e.g. an order's
status) and `revalidate_state` (run at approve time, re-fetches the same
fields and raises DomainError if they've drifted from the snapshot). This
is what stops an approval from firing against a target that moved on
since the proposal was made — see agent_service.approve_action.

Adding a new tool means adding one entry to TOOL_REGISTRY; nothing else in
the agent stack needs to change to pick it up.
"""
from dataclasses import dataclass, field
from collections.abc import Collection
from typing import Any, Callable, Optional

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.models import NguoiDung
from app.services.agent.action_policy import (
    APPROVAL_REQUIRED,
    AUTO_ALLOWED,
    NEVER_AUTOMATE,
    VALID_EXECUTION_POLICIES,
)
from app.services.agent import state_service
from app.services.alerts import AlertService
from app.services.batches.batch_service import BatchService
from app.services.errors import DomainError
from app.services.gift_boxes.gift_box_service import GiftBoxService
from app.services.orders.order_service import OrderService
from app.services.payments.payment_service import PaymentService

_alert_service = AlertService()
_batch_service = BatchService()
_order_service = OrderService()
_payment_service = PaymentService()
_gift_box_service = GiftBoxService()

_BATCH_KINDS = ("products", "components", "gift_boxes")
_BATCH_STATUSES = ("hoatdong", "tamdung", "hethan", "daxuathet")


class _AlertUpdatePayload(BaseModel):
    trang_thai: Optional[str] = None
    ghi_chu: Optional[str] = None


class _BatchStatusPayload(BaseModel):
    trang_thai: str = Field(pattern="^(hoatdong|tamdung|hethan|daxuathet)$")


# ---------------------------------------------------------------------------
# Alerts (V1 — read/execute)
# ---------------------------------------------------------------------------
def _resolve_alert(db: Session, params: dict, current_user: NguoiDung) -> dict:
    payload = _AlertUpdatePayload(trang_thai="da_xu_ly", ghi_chu=params.get("note"))
    return _alert_service.update_alert(db, int(params["alert_id"]), payload, current_user)


def _dismiss_alert(db: Session, params: dict, current_user: NguoiDung) -> dict:
    payload = _AlertUpdatePayload(trang_thai="bo_qua", ghi_chu=params.get("note"))
    return _alert_service.update_alert(db, int(params["alert_id"]), payload, current_user)


def _generate_alerts(db: Session, params: dict, current_user: NguoiDung) -> dict:
    return _alert_service.generate_alerts(
        db,
        low_stock_threshold=int(params.get("low_stock_threshold", 10)),
        expiring_days=int(params.get("expiring_days", 7)),
    )


def _list_pending_alerts(db: Session, params: dict, current_user: NguoiDung) -> dict:
    limit = int(params.get("limit", 10))
    return {"alerts": _alert_service.list_alerts(db, trang_thai="chua_xu_ly", limit=limit)}


def _get_alert_summary(db: Session, params: dict, current_user: NguoiDung) -> dict:
    return _alert_service.get_summary(db)


def _list_stale_orders(db: Session, params: dict, current_user: NguoiDung) -> dict:
    hours = int(params.get("hours", 24))
    limit = int(params.get("limit", 10))
    return state_service.list_stale_orders(db, hours=hours, limit=limit)


# ---------------------------------------------------------------------------
# Batches (V1 execute, now with staleness capture)
# ---------------------------------------------------------------------------
def _set_batch_status(db: Session, params: dict, current_user: NguoiDung) -> dict:
    kind = params["kind"]
    if kind not in _BATCH_KINDS:
        raise DomainError(status_code=400, detail=f"Loại lô hàng không hợp lệ: {kind}")
    payload = _BatchStatusPayload(trang_thai=params["trang_thai"])
    return _batch_service.update_batch(db, kind, int(params["batch_id"]), payload)


def _capture_batch_state(db: Session, params: dict, current_user: NguoiDung) -> dict:
    batch = _batch_service.get_batch(db, params["kind"], int(params["batch_id"]))
    return {"trang_thai": batch["trang_thai"]}


def _revalidate_batch_state(db: Session, params: dict, preconditions: dict, current_user: NguoiDung) -> None:
    live = _capture_batch_state(db, params, current_user)
    if live != preconditions:
        raise DomainError(
            status_code=409,
            detail=(
                "ACTION_STALE: Trạng thái lô hàng đã thay đổi kể từ lúc đề xuất "
                f"(lúc đề xuất: '{preconditions.get('trang_thai')}', hiện tại: '{live.get('trang_thai')}'). "
                "Vui lòng kiểm tra lại trước khi duyệt."
            ),
        )


def _get_expiring_batches(db: Session, params: dict, current_user: NguoiDung) -> dict:
    return _batch_service.get_expiring_batches(db, int(params.get("days", 7)))


# ---------------------------------------------------------------------------
# Orders (V2 — order operations use case)
# ---------------------------------------------------------------------------
def _get_order_details(db: Session, params: dict, current_user: NguoiDung) -> dict:
    order_id = int(params["order_id"])
    order = _order_service.get_order(db, order_id, current_user)
    payments = _payment_service.get_order_payments(db, order_id, current_user)
    return {"order": order, "payments": payments}


def _cancel_order(db: Session, params: dict, current_user: NguoiDung) -> dict:
    reason = params.get("reason") or "Đề xuất từ Operations Agent"
    return _order_service.cancel_order(db, int(params["order_id"]), reason, current_user)


def _capture_order_state(db: Session, params: dict, current_user: NguoiDung) -> dict:
    order = _order_service.get_order(db, int(params["order_id"]), current_user)
    ngay_cap_nhat = order.get("ngay_cap_nhat")
    return {"trang_thai": order["trang_thai"], "ngay_cap_nhat": ngay_cap_nhat.isoformat() if ngay_cap_nhat else None}


def _revalidate_order_state(db: Session, params: dict, preconditions: dict, current_user: NguoiDung) -> None:
    live = _capture_order_state(db, params, current_user)
    if live != preconditions:
        raise DomainError(
            status_code=409,
            detail=(
                "ACTION_STALE: Trạng thái đơn hàng đã thay đổi kể từ lúc đề xuất "
                f"(lúc đề xuất: '{preconditions.get('trang_thai')}', hiện tại: '{live.get('trang_thai')}'). "
                "Vui lòng kiểm tra lại đơn hàng trước khi duyệt."
            ),
        )


# ---------------------------------------------------------------------------
# Production feasibility (V2 — only real for gift boxes; see tools.py
# module docstring / agent V2 plan for why plain products can't get a true
# ingredient-level answer: Leaf Crème has no recipe/BOM for baked products,
# only for gift-box assembly (HopQuaBOM).
# ---------------------------------------------------------------------------
def _get_gift_box_bom(db: Session, params: dict, current_user: NguoiDung) -> dict:
    return {"bom": _gift_box_service.list_bom(db, int(params["hop_qua_id"]))}


def _check_production_feasibility(db: Session, params: dict, current_user: NguoiDung) -> dict:
    target_type = params["target_type"]
    quantity = int(params["quantity"])

    if target_type == "hopqua":
        hop_qua_id = int(params["target_id"])
        bom = _gift_box_service.list_bom(db, hop_qua_id)
        if not bom:
            return {
                "has_recipe": False,
                "message": "Hộp quà này chưa có công thức (BOM) được khai báo trong hệ thống.",
            }

        requirements = []
        feasible = True
        for item in bom:
            required = item["so_luong"] * quantity
            inventory = _batch_service.get_product_inventory(db, item["bienthe_id"])
            available = sum(row["so_luong_hien_tai"] or 0 for row in inventory)
            shortage = max(required - available, 0)
            feasible = feasible and shortage == 0
            requirements.append({
                "bienthe_id": item["bienthe_id"],
                "product_name": item.get("product_name"),
                "variant_name": item.get("variant_name"),
                "required": required,
                "available": available,
                "shortage": shortage,
            })
        return {"has_recipe": True, "target_quantity": quantity, "feasible": feasible, "requirements": requirements}

    # target_type == "bienthe": no ingredient-level recipe exists for a
    # plain baked product in Leaf Crème's data model — report finished-good
    # stock instead of fabricating a shortage calculation.
    bienthe_id = int(params["target_id"])
    inventory = _batch_service.get_product_inventory(db, bienthe_id)
    available = sum(row["so_luong_hien_tai"] or 0 for row in inventory)
    return {
        "has_recipe": False,
        "message": (
            "Leaf Crème hiện không lưu công thức nguyên liệu cho sản phẩm bánh — chỉ theo dõi "
            "tồn kho thành phẩm theo lô. Không thể tính chính xác khả năng sản xuất theo nguyên liệu."
        ),
        "current_stock": available,
        "requested_quantity": quantity,
    }


# ---------------------------------------------------------------------------
# Replenishment (V2 — signal-based; no purchase-order domain exists, so the
# "draft" is a recorded recommendation, not a fabricated PO)
# ---------------------------------------------------------------------------
def _get_replenishment_signals(db: Session, params: dict, current_user: NguoiDung) -> dict:
    limit = int(params.get("limit", 20))
    low_stock = _alert_service.list_alerts(db, loai_canh_bao="ton_kho_thap", trang_thai="chua_xu_ly", limit=limit)
    return {"low_stock_alerts": low_stock}


def _draft_replenishment_note(db: Session, params: dict, current_user: NguoiDung) -> dict:
    alert_id = int(params["alert_id"])
    so_luong_de_nghi = int(params["so_luong_de_nghi"])
    ly_do = params.get("ly_do") or ""
    note = f"[Đề xuất nhập thêm {so_luong_de_nghi} đơn vị — Operations Agent] {ly_do}".strip()
    payload = _AlertUpdatePayload(trang_thai=None, ghi_chu=note)
    return _alert_service.update_alert(db, alert_id, payload, current_user)


# ---------------------------------------------------------------------------
# Internal proactive actions. These are not exposed to the LLM or action
# picker; the code-governed proactive orchestrator is their only caller.
# Lazy imports avoid coupling the general registry to the proactive module's
# startup lifecycle.
# ---------------------------------------------------------------------------
def _create_proactive_notification(
    db: Session,
    params: dict,
    current_user: Optional[NguoiDung],
) -> dict:
    from app.services.agent.proactive_actions import create_proactive_notification

    return create_proactive_notification(db, params, current_user)


def _capture_proactive_notification_state(
    db: Session,
    params: dict,
    current_user: Optional[NguoiDung],
) -> dict:
    from app.services.agent.proactive_actions import capture_notification_state

    return capture_notification_state(db, params, current_user)


def _revalidate_proactive_notification_state(
    db: Session,
    params: dict,
    preconditions: dict,
    current_user: Optional[NguoiDung],
) -> None:
    from app.services.agent.proactive_actions import revalidate_notification_state

    revalidate_notification_state(db, params, preconditions, current_user)


@dataclass(frozen=True)
class AgentTool:
    name: str
    description: str
    classification: str  # "read" | "draft" | "execute"
    required_params: frozenset[str]
    execute: Callable[[Session, dict, Optional[NguoiDung]], dict]
    execution_policy: str
    optional_params: frozenset[str] = field(default_factory=frozenset)
    risk_level: str = "low"  # "low" | "medium" | "high" — independent of classification
    idempotent: bool = False
    auto_execute: bool = False
    self_revalidating: bool = False
    internal_only: bool = False
    # JSON-schema fragment per param — {"type": "integer"}, {"type": "string",
    # "enum": [...]}, etc. Used to build the OpenAI-compatible function-
    # calling schema (see chat_tool_schemas) as well as /agent/tools.
    # Params without an entry here default to {"type": "string"}.
    param_schema: dict[str, dict[str, Any]] = field(default_factory=dict)
    # Stale-approval guard — see module docstring. Only meaningful for
    # "execute" tools with a single identifiable target.
    capture_state: Optional[Callable[[Session, dict, Optional[NguoiDung]], dict]] = None
    revalidate_state: Optional[Callable[[Session, dict, dict, Optional[NguoiDung]], None]] = None

    def __post_init__(self) -> None:
        if self.execution_policy not in VALID_EXECUTION_POLICIES:
            raise ValueError(f"Invalid execution policy for {self.name}: {self.execution_policy}")
        if self.execution_policy == NEVER_AUTOMATE and self.auto_execute:
            raise ValueError(f"NEVER_AUTOMATE tool {self.name} cannot enable auto execution")


TOOL_REGISTRY: dict[str, AgentTool] = {
    # -- Alerts (read) --------------------------------------------------
    "get_alert_summary": AgentTool(
        name="get_alert_summary",
        description="Get counts of pending/processing/resolved inventory alerts, broken down by type and severity.",
        classification="read",
        required_params=frozenset(),
        execute=_get_alert_summary,
        execution_policy=AUTO_ALLOWED,
        idempotent=True,
    ),
    "list_pending_alerts": AgentTool(
        name="list_pending_alerts",
        description="List the most urgent unresolved inventory alerts (low stock, expiring, expired), most severe first.",
        classification="read",
        required_params=frozenset(),
        optional_params=frozenset({"limit"}),
        execute=_list_pending_alerts,
        execution_policy=AUTO_ALLOWED,
        idempotent=True,
        param_schema={"limit": {"type": "integer", "minimum": 1, "maximum": 100, "description": "Max alerts to return. Default 10."}},
    ),
    "list_stale_orders": AgentTool(
        name="list_stale_orders",
        description="List orders that have been sitting unfulfilled (cho/cho_coc/dang_xu_ly) longer than a given number of hours.",
        classification="read",
        required_params=frozenset(),
        optional_params=frozenset({"hours", "limit"}),
        execute=_list_stale_orders,
        execution_policy=AUTO_ALLOWED,
        idempotent=True,
        param_schema={
            "hours": {"type": "integer", "minimum": 1, "maximum": 720, "description": "Age threshold in hours (max 30 days). Default 24."},
            "limit": {"type": "integer", "minimum": 1, "maximum": 100, "description": "Max orders to return. Default 10."},
        },
    ),
    "get_expiring_batches": AgentTool(
        name="get_expiring_batches",
        description="List product/component/gift-box batches expiring within N days, with current stock.",
        classification="read",
        required_params=frozenset(),
        optional_params=frozenset({"days"}),
        execute=_get_expiring_batches,
        execution_policy=AUTO_ALLOWED,
        idempotent=True,
        param_schema={"days": {"type": "integer", "minimum": 1, "maximum": 90, "description": "Look-ahead window in days. Default 7."}},
    ),
    # -- Alerts (execute) -------------------------------------------------
    "generate_alerts": AgentTool(
        name="generate_alerts",
        description="Scan current inventory and create alerts for any low-stock or expiring/expired batch that doesn't already have one.",
        classification="execute",
        risk_level="low",
        required_params=frozenset(),
        optional_params=frozenset({"low_stock_threshold", "expiring_days"}),
        execute=_generate_alerts,
        execution_policy=AUTO_ALLOWED,
        idempotent=True,
        auto_execute=True,
        self_revalidating=True,
        param_schema={
            "low_stock_threshold": {"type": "integer", "minimum": 1, "maximum": 100000, "description": "Units at or below this count are flagged. Default 10."},
            "expiring_days": {"type": "integer", "minimum": 1, "maximum": 365, "description": "Days out to flag as expiring soon. Default 7."},
        },
    ),
    "resolve_alert": AgentTool(
        name="resolve_alert",
        description="Mark an inventory alert as resolved (da_xu_ly), e.g. after restocking or discarding the batch.",
        classification="execute",
        risk_level="low",
        required_params=frozenset({"alert_id"}),
        optional_params=frozenset({"note"}),
        execute=_resolve_alert,
        execution_policy=APPROVAL_REQUIRED,
        param_schema={
            "alert_id": {"type": "integer", "minimum": 1, "description": "canhbao_id of the alert to resolve."},
            "note": {"type": "string", "maxLength": 1000, "description": "Optional note explaining the resolution."},
        },
    ),
    "dismiss_alert": AgentTool(
        name="dismiss_alert",
        description="Dismiss an inventory alert as not actionable (bo_qua).",
        classification="execute",
        risk_level="low",
        required_params=frozenset({"alert_id"}),
        optional_params=frozenset({"note"}),
        execute=_dismiss_alert,
        execution_policy=APPROVAL_REQUIRED,
        param_schema={
            "alert_id": {"type": "integer", "minimum": 1, "description": "canhbao_id of the alert to dismiss."},
            "note": {"type": "string", "maxLength": 1000, "description": "Optional note explaining why it was dismissed."},
        },
    ),
    "set_batch_status": AgentTool(
        name="set_batch_status",
        description="Change a batch's status (e.g. pause a batch with a quality issue: trang_thai=tamdung).",
        classification="execute",
        risk_level="medium",
        required_params=frozenset({"kind", "batch_id", "trang_thai"}),
        execute=_set_batch_status,
        execution_policy=APPROVAL_REQUIRED,
        param_schema={
            "kind": {"type": "string", "enum": list(_BATCH_KINDS), "description": "Which batch table the batch belongs to."},
            "batch_id": {"type": "integer", "minimum": 1, "description": "lohang_id of the batch."},
            "trang_thai": {"type": "string", "enum": list(_BATCH_STATUSES), "description": "New batch status."},
        },
        capture_state=_capture_batch_state,
        revalidate_state=_revalidate_batch_state,
    ),
    # -- Orders (V2) ------------------------------------------------------
    "get_order_details": AgentTool(
        name="get_order_details",
        description="Get full order details (items, status, delivery) plus its payment records.",
        classification="read",
        required_params=frozenset({"order_id"}),
        execute=_get_order_details,
        execution_policy=AUTO_ALLOWED,
        idempotent=True,
        param_schema={"order_id": {"type": "integer", "minimum": 1, "description": "donhang_id of the order."}},
    ),
    "cancel_order": AgentTool(
        name="cancel_order",
        description=(
            "Cancel an order: restores reserved inventory and voucher usage, sets status to da_huy. "
            "Does NOT touch payments — any refund must be handled separately."
        ),
        classification="execute",
        risk_level="high",
        required_params=frozenset({"order_id"}),
        optional_params=frozenset({"reason"}),
        execute=_cancel_order,
        execution_policy=NEVER_AUTOMATE,
        param_schema={
            "order_id": {"type": "integer", "minimum": 1, "description": "donhang_id of the order to cancel."},
            "reason": {"type": "string", "maxLength": 500, "description": "Why the order is being cancelled."},
        },
        capture_state=_capture_order_state,
        revalidate_state=_revalidate_order_state,
    ),
    # -- Production feasibility (V2) --------------------------------------
    "get_gift_box_bom": AgentTool(
        name="get_gift_box_bom",
        description="Get a gift box's bill of materials (which product variants and quantities make it up).",
        classification="read",
        required_params=frozenset({"hop_qua_id"}),
        execute=_get_gift_box_bom,
        execution_policy=AUTO_ALLOWED,
        idempotent=True,
        param_schema={"hop_qua_id": {"type": "integer", "minimum": 1, "description": "hop_qua_id of the gift box."}},
    ),
    "check_production_feasibility": AgentTool(
        name="check_production_feasibility",
        description=(
            "Check whether a target quantity can be produced/assembled right now. Only gift boxes "
            "(target_type='hopqua') have a real bill-of-materials in Leaf Crème and get a true "
            "shortage calculation; plain products (target_type='bienthe') have no ingredient-level "
            "recipe on file, so this reports current finished-good stock instead."
        ),
        classification="read",
        required_params=frozenset({"target_type", "target_id", "quantity"}),
        execute=_check_production_feasibility,
        execution_policy=AUTO_ALLOWED,
        idempotent=True,
        param_schema={
            "target_type": {"type": "string", "enum": ["hopqua", "bienthe"], "description": "'hopqua' for a gift box (has a BOM), 'bienthe' for a plain product variant (no recipe)."},
            "target_id": {"type": "integer", "minimum": 1, "description": "hop_qua_id or bienthe_id depending on target_type."},
            "quantity": {"type": "integer", "minimum": 1, "maximum": 100000, "description": "Quantity to check feasibility for."},
        },
    ),
    # -- Replenishment (V2) ------------------------------------------------
    "get_replenishment_signals": AgentTool(
        name="get_replenishment_signals",
        description="List current low-stock signals (unresolved ton_kho_thap alerts) that may need reordering.",
        classification="read",
        required_params=frozenset(),
        optional_params=frozenset({"limit"}),
        execute=_get_replenishment_signals,
        execution_policy=AUTO_ALLOWED,
        idempotent=True,
        param_schema={"limit": {"type": "integer", "minimum": 1, "maximum": 100, "description": "Max signals to return. Default 20."}},
    ),
    "draft_replenishment_note": AgentTool(
        name="draft_replenishment_note",
        description=(
            "Record a replenishment recommendation on a low-stock alert (recommended reorder quantity "
            "and reasoning). Leaf Crème has no purchase-order system — this only writes a note for staff "
            "to act on manually, it does not create or send any order."
        ),
        classification="draft",
        risk_level="low",
        required_params=frozenset({"alert_id", "so_luong_de_nghi"}),
        optional_params=frozenset({"ly_do"}),
        execute=_draft_replenishment_note,
        execution_policy=APPROVAL_REQUIRED,
        param_schema={
            "alert_id": {"type": "integer", "minimum": 1, "description": "canhbao_id of the related low-stock alert."},
            "so_luong_de_nghi": {"type": "integer", "minimum": 1, "maximum": 1000000, "description": "Recommended reorder quantity."},
            "ly_do": {"type": "string", "maxLength": 500, "description": "Reasoning behind the recommended quantity."},
        },
    ),
    "create_proactive_notification": AgentTool(
        name="create_proactive_notification",
        description="Create a deduplicated internal notification for a revalidated proactive expiry condition.",
        classification="draft",
        risk_level="low",
        required_params=frozenset({
            "source_alert_id", "fingerprint", "scenario", "severity", "title",
            "recommendation", "evidence", "tool_trace", "prompt_version", "used_llm",
        }),
        optional_params=frozenset({"model", "reopen_existing"}),
        execute=_create_proactive_notification,
        execution_policy=AUTO_ALLOWED,
        idempotent=True,
        auto_execute=True,
        internal_only=True,
        param_schema={
            "source_alert_id": {"type": "integer", "minimum": 1},
            "fingerprint": {"type": "string", "maxLength": 64},
            "scenario": {"type": "string", "enum": ["expiring_batch"]},
            "severity": {"type": "string", "enum": ["cao"]},
            "title": {"type": "string", "maxLength": 300},
            "recommendation": {"type": "string", "maxLength": 4000},
            "prompt_version": {"type": "string", "maxLength": 100},
            "model": {"type": "string", "maxLength": 100},
        },
        capture_state=_capture_proactive_notification_state,
        revalidate_state=_revalidate_proactive_notification_state,
    ),
}


def get_tool(name: str) -> AgentTool:
    tool = TOOL_REGISTRY.get(name)
    if tool is None:
        raise DomainError(status_code=404, detail=f"Không tìm thấy công cụ agent: {name}")
    return tool


def validate_params(tool: AgentTool, params: dict) -> None:
    """Checks required/allowed param names, then enforces each param's
    declared type/bounds from `param_schema` — the choke point every tool
    call goes through (propose_action for both immediate "read" execution
    and "draft"/"execute" proposals, plus the chat loop's tool calls), so a
    bad `limit`/`hours`/`threshold`/enum (from a client, or a model that
    hallucinates an argument) is rejected here rather than reaching a
    service method with an unbounded query or an invalid state transition.
    """
    missing = tool.required_params - params.keys()
    if missing:
        raise DomainError(
            status_code=400,
            detail=f"Thiếu tham số bắt buộc cho '{tool.name}': {', '.join(sorted(missing))}",
        )
    allowed = tool.required_params | tool.optional_params
    unknown = params.keys() - allowed
    if unknown:
        raise DomainError(
            status_code=400,
            detail=f"Tham số không hợp lệ cho '{tool.name}': {', '.join(sorted(unknown))}",
        )

    for name, value in params.items():
        schema = tool.param_schema.get(name)
        if not schema or value is None:
            continue

        if schema.get("type") == "integer":
            try:
                numeric = int(value)
            except (TypeError, ValueError):
                raise DomainError(status_code=400, detail=f"Tham số '{name}' của '{tool.name}' phải là số nguyên")
            minimum = schema.get("minimum")
            maximum = schema.get("maximum")
            if minimum is not None and numeric < minimum:
                raise DomainError(status_code=400, detail=f"Tham số '{name}' của '{tool.name}' phải >= {minimum}")
            if maximum is not None and numeric > maximum:
                raise DomainError(status_code=400, detail=f"Tham số '{name}' của '{tool.name}' phải <= {maximum}")

        enum = schema.get("enum")
        if enum is not None and value not in enum:
            raise DomainError(
                status_code=400,
                detail=f"Tham số '{name}' của '{tool.name}' phải là một trong: {', '.join(str(v) for v in enum)}",
            )

        max_length = schema.get("maxLength")
        if max_length is not None and isinstance(value, str) and len(value) > max_length:
            raise DomainError(status_code=400, detail=f"Tham số '{name}' của '{tool.name}' dài tối đa {max_length} ký tự")


def describe_tools(*, include_internal: bool = True) -> list[dict[str, Any]]:
    """Serializable catalogue of available tools — used by the admin UI to
    render an action picker."""
    return [
        {
            "name": tool.name,
            "description": tool.description,
            "classification": tool.classification,
            "risk_level": tool.risk_level,
            "execution_policy": tool.execution_policy,
            "idempotent": tool.idempotent,
            "internal_only": tool.internal_only,
            "required_params": sorted(tool.required_params),
            "optional_params": sorted(tool.optional_params),
            "param_schema": tool.param_schema,
        }
        for tool in TOOL_REGISTRY.values()
        if include_internal or not tool.internal_only
    ]


def chat_tool_schemas() -> list[dict[str, Any]]:
    """Tool definitions in the OpenAI-compatible function-calling format
    (used for DeepSeek's chat completions API) — one entry per registered
    tool, mutating tools included (the chat loop routes "draft"/"execute"
    calls through propose_action instead of executing them directly; see
    agent_service._execute_tool_call)."""
    schemas = []
    for tool in TOOL_REGISTRY.values():
        if tool.internal_only:
            continue
        properties = {
            name: tool.param_schema.get(name, {"type": "string"})
            for name in sorted(tool.required_params | tool.optional_params)
        }
        schemas.append({
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": sorted(tool.required_params),
                },
            },
        })
    return schemas


def read_tool_schemas(allowed_names: Collection[str]) -> list[dict[str, Any]]:
    """Return schemas for an explicit, code-governed read-only allowlist.

    Proactive jobs must never receive the interactive chat registry, because
    that registry also exposes draft/execute tools.  This function enforces
    the boundary in code before anything is sent to an LLM.
    """
    allowed = frozenset(allowed_names)
    unknown = allowed - TOOL_REGISTRY.keys()
    if unknown:
        raise ValueError(f"Unknown Agent tool(s): {', '.join(sorted(unknown))}")

    non_read = [name for name in allowed if TOOL_REGISTRY[name].classification != "read"]
    if non_read:
        raise ValueError(f"Proactive tool allowlist may contain only read tools: {', '.join(sorted(non_read))}")

    return [
        schema for schema in chat_tool_schemas()
        if schema["function"]["name"] in allowed
    ]
