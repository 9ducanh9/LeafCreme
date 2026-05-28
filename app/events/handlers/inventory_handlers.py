from sqlalchemy.orm import Session

from app.events.types import DomainEvent


def handle_inventory_event(db: Session, event: DomainEvent) -> None:
    return None
