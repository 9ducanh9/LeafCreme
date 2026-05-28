from sqlalchemy.orm import Session

from app.events.types import DomainEvent


def handle_analytics_event(db: Session, event: DomainEvent) -> None:
    return None
