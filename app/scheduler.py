"""
APScheduler wiring for the two background jobs identified in the domain
audit (see app/services/maintenance/maintenance_service.py module
docstring for *why* these exist — this module is only *when/how* they run).

Deliberately a BackgroundScheduler (thread-based), not AsyncIOScheduler:
the whole app is synchronous SQLAlchemy end to end, so a sync job running
in APScheduler's own thread pool — each with its own short-lived DB
session, same as a request would get via app.db.get_db — is the simplest
fit. No shared state with the request-handling threads other than the DB
itself.

Guarded against starting during tests: importing app.main (e.g. the route
count sanity check, or any test that spins up a TestClient) must not spin
up a real background thread hitting a real-or-fake DATABASE_URL outside of
a request. PYTEST_CURRENT_TEST is set by pytest for the duration of every
test it runs, so checking it here is the standard way to detect "we're
inside a test" without threading a flag through every caller.
"""
import logging
import os
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import text

from app.db import SessionLocal, engine
from app.services.maintenance import MaintenanceService

logger = logging.getLogger("bakeryonl.scheduler")

_STALE_PAYMENT_SWEEP_INTERVAL_MINUTES = 15
_STALE_PAYMENT_THRESHOLD_MINUTES = 30
_ALERT_SCAN_INTERVAL_MINUTES = 1
_INVENTORY_SCAN_LOCK = 74190321

_maintenance_service = MaintenanceService()
_scheduler: BackgroundScheduler | None = None


def _sweep_stale_payments_job() -> None:
    db = SessionLocal()
    try:
        result = _maintenance_service.sweep_stale_pending_payments(
            db, stale_after_minutes=_STALE_PAYMENT_THRESHOLD_MINUTES
        )
        if result["swept"] or result["errors"]:
            logger.info("Stale payment sweep: %s", result)
    except Exception:
        logger.exception("Stale payment sweep job crashed")
    finally:
        db.close()


def _inventory_alert_scan_job() -> None:
    try:
        # Hold a dedicated connection: domain services commit independently.
        with engine.connect() as lock_connection:
            acquired = lock_connection.execute(
                text("SELECT pg_try_advisory_lock(:key)"), {"key": _INVENTORY_SCAN_LOCK}
            ).scalar()
            if not acquired:
                return
            try:
                with SessionLocal() as db:
                    result = _maintenance_service.run_daily_alert_scan(db)
                    logger.info("Inventory alert scan: %s", result)
            finally:
                try:
                    lock_connection.execute(
                        text("SELECT pg_advisory_unlock(:key)"), {"key": _INVENTORY_SCAN_LOCK}
                    )
                except Exception:
                    lock_connection.invalidate()
                    raise
    except Exception:
        logger.exception("Inventory alert scan job crashed")


def start_scheduler() -> None:
    """Called from app.main's startup event. No-op if already running or if
    running inside pytest (see module docstring)."""
    global _scheduler

    if os.getenv("PYTEST_CURRENT_TEST"):
        return
    if os.getenv("SCHEDULER_ENABLED", "true").lower() in ("false", "0", "no"):
        logger.info("Scheduler disabled via SCHEDULER_ENABLED env var")
        return
    if _scheduler is not None:
        return

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        _sweep_stale_payments_job,
        "interval",
        minutes=_STALE_PAYMENT_SWEEP_INTERVAL_MINUTES,
        id="sweep_stale_payments",
        coalesce=True,
        max_instances=1,
    )
    _scheduler.add_job(
        _inventory_alert_scan_job,
        "interval",
        minutes=_ALERT_SCAN_INTERVAL_MINUTES,
        id="inventory_alert_scan",
        coalesce=True,
        max_instances=1,
        next_run_time=datetime.now(timezone.utc),
    )
    _scheduler.start()
    logger.info(
        "Scheduler started: stale-payment sweep every %sm, inventory alert scan every %sm",
        _STALE_PAYMENT_SWEEP_INTERVAL_MINUTES,
        _ALERT_SCAN_INTERVAL_MINUTES,
    )


def request_inventory_attention_refresh() -> bool:
    """Wake the existing scanner; periodic/startup scans recover persisted conditions.

    This is deliberately not an in-memory event queue. Missed wakeups cannot
    erase inventory state; the next scan re-evaluates current DB conditions.
    """
    if _scheduler is None or not _scheduler.running:
        return False
    try:
        _scheduler.modify_job("inventory_alert_scan", next_run_time=datetime.now(timezone.utc))
        return True
    except Exception:
        logger.exception("Unable to request inventory attention scan")
        return False


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
