"""Shared pytest fixtures.

Runs against a real Postgres (never SQLite) because the schema uses
Postgres-only types (JSONB, native ENUM, TEXT[]) — SQLite would silently
hide real bugs. Locally this is the `db` service from docker-compose.yml;
in CI it's the postgres service container in .github/workflows/ci.yml.

Migrations are applied once per test session via Alembic (not
Base.metadata.create_all) so the test suite exercises the same schema path
that staging/production go through.
"""
import os
import re
import sys

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
_PROTECTED_ENVS = {"prod", "production", "staging"}
_DISPOSABLE_DB = re.compile(r"(^|[_-])test([_-]|$)", re.IGNORECASE)


def _assert_disposable(url: str) -> None:
    app_env = os.getenv("APP_ENV", "").strip().lower()
    if app_env in _PROTECTED_ENVS:
        pytest.exit(f"APP_ENV={app_env!r} — từ chối chạy test suite.", returncode=4)

    database = make_url(url).database or ""
    if not _DISPOSABLE_DB.search(database):
        pytest.exit(
            f"Từ chối chạy test trên database {database!r}: tên database phải chứa "
            "'test' (ví dụ bakery_test). Suite này chạy alembic downgrade base "
            "ở teardown và sẽ xoá schema. Đặt TEST_DATABASE_URL tới database dùng một lần.",
            returncode=4,
        )


@pytest.fixture()
def role_staff(db_session):
    from app.models import VaiTro

    role = VaiTro(ten_vai_tro="staff")
    db_session.add(role)
    db_session.flush()
    return role


@pytest.fixture()
def role_manager(db_session):
    from app.models import VaiTro

    role = VaiTro(ten_vai_tro="manager")
    db_session.add(role)
    db_session.flush()
    return role


def _alembic_config() -> Config:
    cfg = Config(os.path.join(ROOT, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(ROOT, "alembic"))
    return cfg


@pytest.fixture(scope="session", autouse=True)
def _migrated_schema():
    """Apply all migrations once before the test session, tear the schema
    back down afterwards so re-runs start clean."""
    if not TEST_DATABASE_URL:
        pytest.exit(
            "Chưa set TEST_DATABASE_URL — xem .env.example. "
            "Không dùng DATABASE_URL của môi trường dev/production để chạy test.",
            returncode=4,
        )
    _assert_disposable(TEST_DATABASE_URL)
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
    cfg = _alembic_config()
    command.upgrade(cfg, "head")
    yield
    command.downgrade(cfg, "base")


@pytest.fixture()
def db_session():
    """One SAVEPOINT-wrapped session per test. Even if the code under test
    calls db.commit(), the outer transaction rolls back at teardown, so
    tests never leak data into each other.
    See: https://docs.sqlalchemy.org/en/20/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites
    """
    engine = create_engine(TEST_DATABASE_URL)
    connection = engine.connect()
    outer_txn = connection.begin()

    Session = sessionmaker(bind=connection)
    session = Session()

    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(sess, transaction):
        nonlocal nested
        if not nested.is_active:
            nested = connection.begin_nested()

    try:
        yield session
    finally:
        session.close()
        outer_txn.rollback()
        connection.close()
        engine.dispose()


@pytest.fixture()
def client(db_session):
    """TestClient wired to the SAVEPOINT-wrapped session above instead of a
    fresh connection per request, so setup done in a test is visible to the
    API calls made in that same test."""
    from fastapi.testclient import TestClient

    from app.db import get_db
    from app.main import app

    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
