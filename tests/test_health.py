"""Phase 0 smoke tests.

These exist to prove the pipeline works end to end (migrations apply, the
app boots with its full middleware/router stack — events, Leafie, payments —
and the DB is reachable) — not to cover business logic yet. Domain test
coverage (orders, FEFO allocation, payment callbacks) is Phase 1+ work.
"""


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
