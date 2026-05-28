from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class DomainEvent:
    name: str
    aggregate_id: int | None = None
    payload: dict[str, Any] = field(default_factory=dict)
    occurred_at: datetime = field(default_factory=datetime.utcnow)


def order_created(order_id: int, payload: dict[str, Any] | None = None) -> DomainEvent:
    return DomainEvent(name="OrderCreated", aggregate_id=order_id, payload=payload or {})


def order_paid(order_id: int, payload: dict[str, Any] | None = None) -> DomainEvent:
    return DomainEvent(name="OrderPaid", aggregate_id=order_id, payload=payload or {})


def order_cancelled(order_id: int, payload: dict[str, Any] | None = None) -> DomainEvent:
    return DomainEvent(name="OrderCancelled", aggregate_id=order_id, payload=payload or {})


def payment_failed(order_id: int, payload: dict[str, Any] | None = None) -> DomainEvent:
    return DomainEvent(name="PaymentFailed", aggregate_id=order_id, payload=payload or {})


def inventory_deducted(order_id: int | None, payload: dict[str, Any] | None = None) -> DomainEvent:
    return DomainEvent(name="InventoryDeducted", aggregate_id=order_id, payload=payload or {})


def inventory_restored(order_id: int | None, payload: dict[str, Any] | None = None) -> DomainEvent:
    return DomainEvent(name="InventoryRestored", aggregate_id=order_id, payload=payload or {})
