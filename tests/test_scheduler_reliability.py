from app import scheduler
from sqlalchemy import text
import os
import subprocess
import sys
import time
from conftest import TEST_DATABASE_URL


def test_scheduler_entrypoint_excludes_process_and_recovers_after_kill(tmp_path):
    child_code = """
import sys, time
from pathlib import Path
from app import scheduler
marker = Path(sys.argv[1])
def scan(db):
    marker.write_text('entered', encoding='ascii')
    if sys.argv[2] == 'hold':
        time.sleep(60)
scheduler._maintenance_service.run_daily_alert_scan = scan
scheduler._inventory_alert_scan_job()
"""
    env = dict(os.environ, DATABASE_URL=TEST_DATABASE_URL, APP_ENV="development",
               LANGFUSE_ENABLED="false", DEEPSEEK_API_KEY="")
    holder_marker = tmp_path / "holder.txt"
    contender_marker = tmp_path / "contender.txt"
    holder = subprocess.Popen([sys.executable, "-c", child_code, str(holder_marker), "hold"], env=env)
    try:
        deadline = time.monotonic() + 10
        while not holder_marker.exists():
            assert holder.poll() is None, "Scheduler holder exited before entering scan"
            assert time.monotonic() < deadline, "Scheduler holder did not enter scan"
            time.sleep(0.1)
        contender = subprocess.run(
            [sys.executable, "-c", child_code, str(contender_marker), "once"],
            env=env, capture_output=True, timeout=15,
        )
        assert contender.returncode == 0, contender.stderr.decode(errors="replace")
        assert not contender_marker.exists(), "Two processes entered the scanner together"
        holder.kill()
        holder.wait(timeout=10)
        deadline = time.monotonic() + 10
        while not contender_marker.exists():
            retry = subprocess.run(
                [sys.executable, "-c", child_code, str(contender_marker), "once"],
                env=env, capture_output=True, timeout=15,
            )
            assert retry.returncode == 0, retry.stderr.decode(errors="replace")
            assert time.monotonic() < deadline, "Scheduler entrypoint did not recover"
    finally:
        if holder.poll() is None:
            holder.kill()
        holder.wait(timeout=10)


def test_inventory_wakeup_without_scheduler_is_nonblocking(monkeypatch):
    monkeypatch.setattr(scheduler, "_scheduler", None)
    assert scheduler.request_inventory_attention_refresh() is False


def test_inventory_wakeup_reschedules_existing_job(monkeypatch):
    calls = []

    class RunningScheduler:
        running = True

        def modify_job(self, job_id, **kwargs):
            calls.append((job_id, kwargs))

    monkeypatch.setattr(scheduler, "_scheduler", RunningScheduler())
    assert scheduler.request_inventory_attention_refresh() is True
    assert calls[0][0] == "inventory_alert_scan"
    assert calls[0][1]["next_run_time"].tzinfo is not None


def test_inventory_wakeup_failure_does_not_escape(monkeypatch):
    class BrokenScheduler:
        running = True

        def modify_job(self, *args, **kwargs):
            raise RuntimeError("scheduler unavailable")

    monkeypatch.setattr(scheduler, "_scheduler", BrokenScheduler())
    assert scheduler.request_inventory_attention_refresh() is False


def test_startup_schedules_immediate_and_periodic_recovery(monkeypatch):
    jobs = []
    started = []

    class FakeScheduler:
        def __init__(self, **kwargs):
            pass

        def add_job(self, function, trigger, **kwargs):
            jobs.append((function, trigger, kwargs))

        def start(self):
            started.append(True)

    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    monkeypatch.setenv("SCHEDULER_ENABLED", "true")
    monkeypatch.setattr(scheduler, "_scheduler", None)
    monkeypatch.setattr(scheduler, "BackgroundScheduler", FakeScheduler)
    scheduler.start_scheduler()
    scheduler.start_scheduler()
    assert len(started) == 1
    assert len(jobs) == 2
    inventory = next(job for job in jobs if job[2]["id"] == "inventory_alert_scan")
    assert inventory[1] == "interval"
    assert inventory[2]["minutes"] == 1
    assert inventory[2]["max_instances"] == 1
    assert inventory[2]["coalesce"] is True
    assert inventory[2]["next_run_time"].tzinfo is not None


def test_inventory_scan_lock_excludes_other_connections_and_releases(monkeypatch):
    calls = []
    monkeypatch.setattr(scheduler._maintenance_service, "run_daily_alert_scan", lambda db: calls.append(True))
    with scheduler.engine.connect() as connection:
        assert connection.execute(text("SELECT pg_try_advisory_lock(:key)"),
                                  {"key": scheduler._INVENTORY_SCAN_LOCK}).scalar()
        try:
            scheduler._inventory_alert_scan_job()
            assert calls == []
        finally:
            connection.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": scheduler._INVENTORY_SCAN_LOCK})
    scheduler._inventory_alert_scan_job()
    assert calls == [True]
    scheduler._inventory_alert_scan_job()
    assert calls == [True, True]


def test_inventory_lock_released_after_holder_process_is_killed():
    child_code = """
import sys, time
from sqlalchemy import create_engine, text
engine = create_engine(sys.argv[1])
with engine.connect() as connection:
    connection.execute(text('SELECT pg_advisory_lock(:key)'), {'key': int(sys.argv[2])})
    time.sleep(60)
"""
    child = subprocess.Popen([sys.executable, "-c", child_code, TEST_DATABASE_URL,
                              str(scheduler._INVENTORY_SCAN_LOCK)])
    try:
        with scheduler.engine.connect() as connection:
            deadline = time.monotonic() + 10
            while True:
                acquired = connection.execute(text("SELECT pg_try_advisory_lock(:key)"),
                                              {"key": scheduler._INVENTORY_SCAN_LOCK}).scalar()
                if not acquired:
                    break
                connection.execute(text("SELECT pg_advisory_unlock(:key)"),
                                   {"key": scheduler._INVENTORY_SCAN_LOCK})
                assert child.poll() is None
                assert time.monotonic() < deadline, "Child did not acquire lock"
                time.sleep(0.1)
            child.kill()
            child.wait(timeout=10)
            deadline = time.monotonic() + 10
            while not connection.execute(text("SELECT pg_try_advisory_lock(:key)"),
                                         {"key": scheduler._INVENTORY_SCAN_LOCK}).scalar():
                assert time.monotonic() < deadline, "Crash did not release lock"
                time.sleep(0.1)
            connection.execute(text("SELECT pg_advisory_unlock(:key)"),
                               {"key": scheduler._INVENTORY_SCAN_LOCK})
    finally:
        if child.poll() is None:
            child.kill()
        child.wait(timeout=10)
