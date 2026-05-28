from collections import defaultdict
from typing import Callable

from sqlalchemy.orm import Session

from app.events.types import DomainEvent

EventHandler = Callable[[Session, DomainEvent], None]


class EventDispatcher:
    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = defaultdict(list)

    def register(self, event_name: str, handler: EventHandler) -> None:
        self._handlers[event_name].append(handler)

    def dispatch(self, db: Session, event: DomainEvent) -> None:
        for handler in self._handlers.get(event.name, []):
            handler(db, event)

    def dispatch_many(self, db: Session, events: list[DomainEvent]) -> None:
        for event in events:
            self.dispatch(db, event)


dispatcher = EventDispatcher()
