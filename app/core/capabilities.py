"""Single source of truth for back-office capabilities."""

from collections.abc import Callable

from fastapi import Depends


CAPABILITIES: dict[str, tuple[str, ...]] = {
    "admin.access": ("admin", "manager", "staff"),
    "dashboard.read": ("admin", "manager"),
    "products.read": ("admin", "manager", "staff"),
    "products.write": ("admin", "manager"),
    "giftbox.read": ("admin", "manager", "staff"),
    "giftbox.write": ("admin", "manager"),
    "giftbox.delete": ("admin",),
    "bom.write": ("admin", "manager"),
    "orders.read.all": ("admin", "manager"),
    "orders.read.own_created": ("admin", "manager", "staff"),
    "orders.pos.create": ("admin", "manager", "staff"),
    "orders.delete": ("admin", "manager"),
    "payments.read": ("admin", "manager", "staff"),
    "payments.manual.create": ("admin", "manager", "staff"),
    "payments.verify": ("admin", "manager"),
    "inventory.read": ("admin", "manager", "staff"),
    "batches.write": ("admin", "manager", "staff"),
    "alerts.read": ("admin", "manager", "staff"),
    "alerts.update": ("admin", "manager", "staff"),
    "alerts.generate": ("admin", "manager"),
    "alerts.delete": ("admin", "manager"),
    "reports.read": ("admin", "manager"),
    "suppliers.read": ("admin", "manager", "staff"),
    "suppliers.write": ("admin", "manager"),
    "users.manage": ("admin",),
    "vouchers.read": ("admin", "manager"),
    "vouchers.write": ("admin", "manager"),
    "agent.chat": ("admin", "manager", "staff"),
    "agent.action.draft": ("admin", "manager", "staff"),
    "agent.action.approve": ("admin", "manager", "staff"),
    "agent.action.execute": ("admin", "manager"),
}


def capabilities_for(role: str | None) -> list[str]:
    """Return deterministic capability names for a role."""

    return sorted(name for name, roles in CAPABILITIES.items() if role in roles)


def require_capability(name: str) -> Callable:
    """Build the same FastAPI dependency shape as ``require_role``."""

    if name not in CAPABILITIES:
        raise KeyError(f"Unknown capability: {name}")

    from app.core.dependencies import require_role

    return require_role(*CAPABILITIES[name])
