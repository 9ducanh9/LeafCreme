"""Governed tool registry for the Operations Agent.

Every action the agent (or a staff member acting through it) can take on
live data is declared here as an `AgentTool` — a name, a risk tier, the
parameters it accepts, and an `execute` callable that goes through the
*existing* domain services (AlertService, BatchService, ...) rather than
touching models directly. That keeps the agent bound to the same
validation and business rules a human clicking through the admin UI would
hit — it has no side door.

Risk tiers:
  - "doc" (read-only): safe to run without a human in the loop. Used for
    tools that only look things up.
  - "thay_doi" (mutating): changes data. AgentService.propose_action always
    stores these as a pending AgentAction row and requires an explicit
    approve call (app/routers/agent.py POST /agent/actions/{id}/approve)
    before `execute` ever runs — see agent_service.py.

Adding a new tool means adding one entry to TOOL_REGISTRY; nothing else in
the agent stack needs to change to pick it up.
"""
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.models import NguoiDung
from app.services.agent import state_service
from app.services.alerts import AlertService
from app.services.batches.batch_service import BatchService
from app.services.errors import DomainError

_alert_service = AlertService()
_batch_service = BatchService()

_BATCH_KINDS = ("products", "components", "gift_boxes")
_BATCH_STATUSES = ("hoatdong", "tamdung", "hethan", "daxuathet")


class _AlertUpdatePayload(BaseModel):
    trang_thai: Optional[str] = None
    ghi_chu: Optional[str] = None


class _BatchStatusPayload(BaseModel):
    trang_thai: str = Field(pattern="^(hoatdong|tamdung|hethan|daxuathet)$")


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


def _set_batch_status(db: Session, params: dict, current_user: NguoiDung) -> dict:
    kind = params["kind"]
    if kind not in _BATCH_KINDS:
        raise DomainError(status_code=400, detail=f"Loại lô hàng không hợp lệ: {kind}")
    payload = _BatchStatusPayload(trang_thai=params["trang_thai"])
    return _batch_service.update_batch(db, kind, int(params["batch_id"]), payload)


def _list_pending_alerts(db: Session, params: dict, current_user: NguoiDung) -> dict:
    limit = int(params.get("limit", 10))
    return {"alerts": _alert_service.list_alerts(db, trang_thai="chua_xu_ly", limit=limit)}


def _get_alert_summary(db: Session, params: dict, current_user: NguoiDung) -> dict:
    return _alert_service.get_summary(db)


def _list_stale_orders(db: Session, params: dict, current_user: NguoiDung) -> dict:
    hours = int(params.get("hours", 24))
    limit = int(params.get("limit", 10))
    return state_service.list_stale_orders(db, hours=hours, limit=limit)


@dataclass(frozen=True)
class AgentTool:
    name: str
    description: str
    risk: str  # "doc" | "thay_doi"
    required_params: frozenset[str]
    execute: Callable[[Session, dict, NguoiDung], dict]
    optional_params: frozenset[str] = field(default_factory=frozenset)
    # JSON-schema fragment per param — {"type": "integer"}, {"type": "string",
    # "enum": [...]}, etc. Used to build the Anthropic tool-use schema (see
    # agent_service._anthropic_tool_schemas) as well as /agent/tools. Params
    # without an entry here default to {"type": "string"}.
    param_schema: dict[str, dict[str, Any]] = field(default_factory=dict)


TOOL_REGISTRY: dict[str, AgentTool] = {
    "get_alert_summary": AgentTool(
        name="get_alert_summary",
        description="Get counts of pending/processing/resolved inventory alerts, broken down by type and severity.",
        risk="doc",
        required_params=frozenset(),
        execute=_get_alert_summary,
    ),
    "list_pending_alerts": AgentTool(
        name="list_pending_alerts",
        description="List the most urgent unresolved inventory alerts (low stock, expiring, expired), most severe first.",
        risk="doc",
        required_params=frozenset(),
        optional_params=frozenset({"limit"}),
        execute=_list_pending_alerts,
        param_schema={"limit": {"type": "integer", "minimum": 1, "maximum": 100, "description": "Max alerts to return. Default 10."}},
    ),
    "list_stale_orders": AgentTool(
        name="list_stale_orders",
        description="List orders that have been sitting unfulfilled (cho/cho_coc/dang_xu_ly) longer than a given number of hours.",
        risk="doc",
        required_params=frozenset(),
        optional_params=frozenset({"hours", "limit"}),
        execute=_list_stale_orders,
        param_schema={
            "hours": {"type": "integer", "minimum": 1, "maximum": 720, "description": "Age threshold in hours (max 30 days). Default 24."},
            "limit": {"type": "integer", "minimum": 1, "maximum": 100, "description": "Max orders to return. Default 10."},
        },
    ),
    "generate_alerts": AgentTool(
        name="generate_alerts",
        description="Scan current inventory and create alerts for any low-stock or expiring/expired batch that doesn't already have one.",
        risk="thay_doi",
        required_params=frozenset(),
        optional_params=frozenset({"low_stock_threshold", "expiring_days"}),
        execute=_generate_alerts,
        param_schema={
            "low_stock_threshold": {"type": "integer", "minimum": 1, "maximum": 100000, "description": "Units at or below this count are flagged. Default 10."},
            "expiring_days": {"type": "integer", "minimum": 1, "maximum": 365, "description": "Days out to flag as expiring soon. Default 7."},
        },
    ),
    "resolve_alert": AgentTool(
        name="resolve_alert",
        description="Mark an inventory alert as resolved (da_xu_ly), e.g. after restocking or discarding the batch.",
        risk="thay_doi",
        required_params=frozenset({"alert_id"}),
        optional_params=frozenset({"note"}),
        execute=_resolve_alert,
        param_schema={
            "alert_id": {"type": "integer", "minimum": 1, "description": "canhbao_id of the alert to resolve."},
            "note": {"type": "string", "maxLength": 1000, "description": "Optional note explaining the resolution."},
        },
    ),
    "dismiss_alert": AgentTool(
        name="dismiss_alert",
        description="Dismiss an inventory alert as not actionable (bo_qua).",
        risk="thay_doi",
        required_params=frozenset({"alert_id"}),
        optional_params=frozenset({"note"}),
        execute=_dismiss_alert,
        param_schema={
            "alert_id": {"type": "integer", "minimum": 1, "description": "canhbao_id of the alert to dismiss."},
            "note": {"type": "string", "maxLength": 1000, "description": "Optional note explaining why it was dismissed."},
        },
    ),
    "set_batch_status": AgentTool(
        name="set_batch_status",
        description="Change a batch's status (e.g. pause a batch with a quality issue: trang_thai=tamdung).",
        risk="thay_doi",
        required_params=frozenset({"kind", "batch_id", "trang_thai"}),
        execute=_set_batch_status,
        param_schema={
            "kind": {"type": "string", "enum": list(_BATCH_KINDS), "description": "Which batch table the batch belongs to."},
            "batch_id": {"type": "integer", "minimum": 1, "description": "lohang_id of the batch."},
            "trang_thai": {"type": "string", "enum": list(_BATCH_STATUSES), "description": "New batch status."},
        },
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
    call goes through (propose_action for both immediate "doc" execution
    and "thay_doi" proposals, plus the chat loop's tool calls), so a bad
    `limit`/`hours`/`threshold` (from a client, or a model that
    hallucinates an extreme value) is rejected here rather than reaching
    a service method with an unbounded query or loop.
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


def describe_tools() -> list[dict[str, Any]]:
    """Serializable catalogue of available tools — used by both the admin
    UI (to render an action picker) and the chat prompt (as the LLM's
    function-calling schema, once wired to a real provider)."""
    return [
        {
            "name": tool.name,
            "description": tool.description,
            "risk": tool.risk,
            "required_params": sorted(tool.required_params),
            "optional_params": sorted(tool.optional_params),
            "param_schema": tool.param_schema,
        }
        for tool in TOOL_REGISTRY.values()
    ]


def anthropic_tool_schemas() -> list[dict[str, Any]]:
    """Tool definitions in Anthropic's tool-use input format — one entry
    per registered tool, mutating tools included (the chat loop routes
    those through propose_action instead of executing them; see
    agent_service._execute_tool_call)."""
    schemas = []
    for tool in TOOL_REGISTRY.values():
        properties = {
            name: tool.param_schema.get(name, {"type": "string"})
            for name in sorted(tool.required_params | tool.optional_params)
        }
        schemas.append({
            "name": tool.name,
            "description": tool.description,
            "input_schema": {
                "type": "object",
                "properties": properties,
                "required": sorted(tool.required_params),
            },
        })
    return schemas
