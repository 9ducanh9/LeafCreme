"""Phase 0 smoke tests.

These exist to prove the pipeline works end to end (migrations apply, the
app boots with its full middleware/router stack — events, Leafie, payments —
and the DB is reachable) — not to cover business logic yet. Domain test
coverage (orders, FEFO allocation, payment callbacks) is Phase 1+ work.
"""

import pytest


@pytest.mark.parametrize("railway,manual,expected", [
    (None, None, None),
    ("A" * 40, None, {"sha": "a" * 40, "source": "RAILWAY_GIT_COMMIT_SHA"}),
    (None, "b" * 40, {"sha": "b" * 40, "source": "APP_COMMIT_SHA"}),
    ("a" * 40, "b" * 40, {"sha": "a" * 40, "source": "RAILWAY_GIT_COMMIT_SHA"}),
    ("synthetic-secret-not-a-sha", "invalid", None),
    ("a" * 32, None, None),
])
def test_health_revision_is_explicit_and_format_validated(client, monkeypatch, railway, manual, expected):
    for key, value in (("RAILWAY_GIT_COMMIT_SHA", railway), ("APP_COMMIT_SHA", manual)):
        if value is None:
            monkeypatch.delenv(key, raising=False)
        else:
            monkeypatch.setenv(key, value)
    for path in ("/health", "/health/db"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.json()["revision"] == expected
        assert "synthetic-secret-not-a-sha" not in response.text


def test_root(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["name"] == "BakeryOnl API"


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_health_db(client):
    resp = client.get("/health/db")
    assert resp.status_code == 200
    assert resp.json()["database"]["status"] == "connected"


def test_migrations_created_expected_tables(db_session):
    from sqlalchemy import inspect

    inspector = inspect(db_session.get_bind())
    tables = set(inspector.get_table_names())
    # Spot-check core + newer tables rather than asserting all 32+1 verbatim,
    # so this test doesn't need editing every time a table is added.
    for expected in (
        "nguoidung", "sanpham", "donhang", "lohangsanpham", "thanhtoan",
        "phanbolo_chitietdonhang",  # added via 0001, was raw SQL before
        "chat_messages",             # added via 0002, n8n-owned
    ):
        assert expected in tables, f"missing table: {expected}"


def test_database_readiness_failure_and_recovery(client):
    from app.db import get_db
    from app.main import app

    original = app.dependency_overrides[get_db]

    class UnavailableDatabase:
        def execute(self, statement):
            raise RuntimeError("postgresql://private-user:secret-password@private-host/db")

    def unavailable():
        yield UnavailableDatabase()

    try:
        app.dependency_overrides[get_db] = unavailable
        response = client.get("/health/db")
        assert response.status_code == 503
        assert response.json()["status"] == "unhealthy"
        assert response.json()["database"]["error"] == "Database unavailable"
        assert "secret-password" not in response.text
        assert "private-host" not in response.text
        assert client.get("/health").status_code == 200
    finally:
        app.dependency_overrides[get_db] = original

    response = client.get("/health/db")
    assert response.status_code == 200
    assert response.json()["database"]["status"] == "connected"
