"""Best-effort runtime hook for deterministic alerts plus Agent insights."""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from .alert_service import (
    DEFAULT_EXPIRING_DAYS,
    DEFAULT_LOW_STOCK_THRESHOLD,
    AlertService,
)


logger = logging.getLogger("bakeryonl.alerts.runtime")


def safe_refresh_inventory_attention(
    db: Session,
    *,
    low_stock_threshold: int = DEFAULT_LOW_STOCK_THRESHOLD,
    expiring_days: int = DEFAULT_EXPIRING_DAYS,
) -> dict[str, Any]:
    """Refresh alerts and proactive insights without breaking business writes.

    Call only after the inventory-changing transaction has committed. Both the
    deterministic scan and observability/LLM path are isolated from the write
    that triggered them.
    """
    try:
        result = AlertService().generate_alerts(db, low_stock_threshold, expiring_days)
        from app.services.agent.proactive_service import safe_refresh_proactive_insights

        result["proactive"] = safe_refresh_proactive_insights(db)
        return result
    except Exception as exc:  # noqa: BLE001 - unattended best-effort boundary
        db.rollback()
        logger.exception("Unable to refresh inventory attention")
        return {"error": type(exc).__name__}
