"""
Maintenance domain service — scheduled background jobs, not an HTTP-facing
service (there's no router for it; app/scheduler.py is the only caller,
running these on a timer via APScheduler).

Two jobs, both flagged as missing infrastructure during the domain audit:

  1. sweep_stale_pending_payments — docs/specs/03-payments.md Finding #3.
     fail_unpaid_order() already exists and is correct, but it was only ever
     called *reactively*, from a payment webhook/status-update arriving. A
     customer who opens a payment flow and simply never comes back (closes
     the tab, wallet times out silently, etc.) leaves their order/inventory
     reservation/voucher hold stuck forever with no webhook ever arriving to
     trigger it. This job finds those and fails them proactively.

  2. run_daily_alert_scan — docs/specs/04-inventory.md Finding #1.
     AlertService.generate_alerts already exists and is correct, but was
     only ever reachable via a manual "Generate Alerts" button
     (POST /alerts/generate) — nothing ran it automatically, so low-stock
     and expiring-batch alerts silently didn't exist unless a staff member
     remembered to click it.

Deliberately NOT using Celery/Redis for this — see
docs/specs/04-inventory.md Finding #1's recommendation and the project's
"Minimal but Valuable" principle: two lightweight periodic jobs on a single
API instance don't justify a distributed task queue. APScheduler
(in-process, single dependency) is proportionate; revisit only if this ever
needs to run across multiple API instances (would then need a lock/leader
election to avoid duplicate runs).
"""

from datetime import timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models import ThanhToan
from app.core.time import utc_now
from app.services.alerts import AlertService
from app.services.alerts.runtime import safe_refresh_inventory_attention
from app.services.orders import OrderService

_STALE_PAYMENT_STATUS = "dang_xu_ly"


class MaintenanceService:
    def __init__(self):
        self.alert_service = AlertService()
        self.order_service = OrderService()

    def sweep_stale_pending_payments(self, db: Session, stale_after_minutes: int = 30) -> dict[str, Any]:
        """Auto-fail orders whose payment has sat in 'dang_xu_ly' longer
        than `stale_after_minutes` with no resolution. Mirrors what happens
        when a webhook explicitly reports failure: restores the inventory
        FEFO-allocated at order creation and releases any voucher usage
        held against the order (see OrderService.fail_unpaid_order).

        Each stale payment is handled in its own try/except so one bad row
        can't block the rest of the sweep — this runs unattended on a
        timer, there's no human watching it fail.
        """
        cutoff = utc_now() - timedelta(minutes=stale_after_minutes)
        stale_payments = (
            db.query(ThanhToan).filter(ThanhToan.trang_thai == _STALE_PAYMENT_STATUS, ThanhToan.ngay_tao < cutoff).all()
        )

        failed_order_ids: list[int] = []
        errors: list[dict[str, Any]] = []
        for payment in stale_payments:
            try:
                self.order_service.fail_unpaid_order(
                    db,
                    payment.donhang_id,
                    f"Auto-cancelled: payment pending > {stale_after_minutes} phút không có phản hồi",
                )
                db.commit()
                failed_order_ids.append(payment.donhang_id)
            except Exception as e:  # noqa: BLE001 — deliberately broad, see docstring
                db.rollback()
                errors.append({"donhang_id": payment.donhang_id, "error": str(e)})

        if failed_order_ids:
            safe_refresh_inventory_attention(db)

        return {"swept": len(failed_order_ids), "order_ids": failed_order_ids, "errors": errors}

    def run_daily_alert_scan(self, db: Session, low_stock_threshold: int = 10, expiring_days: int = 7) -> dict:
        """Thin passthrough to the existing, already-correct
        AlertService.generate_alerts — same defaults as the manual
        POST /alerts/generate endpoint (app/routers/alerts.py)."""
        return safe_refresh_inventory_attention(
            db,
            low_stock_threshold=low_stock_threshold,
            expiring_days=expiring_days,
        )
