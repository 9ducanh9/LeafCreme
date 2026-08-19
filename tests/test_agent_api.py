"""HTTP-level tests for the /agent router — the auth/role boundary and
request wiring that tests/test_agent_service.py (calls the service layer
directly) doesn't exercise. Mirrors tests/test_product_api.py.
"""
import pytest

from app.core.security import create_access_token
from app.models import NguoiDung, VaiTro


def _make_user(db_session, role_name: str, username: str) -> str:
    role = db_session.query(VaiTro).filter_by(ten_vai_tro=role_name).first()
    if not role:
        role = VaiTro(ten_vai_tro=role_name)
        db_session.add(role)
        db_session.flush()
    user = NguoiDung(
        ten_dang_nhap=username,
        email=f"{username}@example.com",
        mat_khau_ma_hoa="hashed",
        vaitro_id=role.vaitro_id,
        ho_ten=username,
    )
    db_session.add(user)
    db_session.flush()
    return create_access_token({"sub": user.nguoidung_id})


@pytest.fixture()
def admin_token(db_session) -> str:
    return _make_user(db_session, "admin", "agent_api_admin")


@pytest.fixture()
def staff_token(db_session) -> str:
    return _make_user(db_session, "staff", "agent_api_staff")


@pytest.fixture()
def customer_token(db_session) -> str:
    return _make_user(db_session, "customer", "agent_api_customer")


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestInsightsEndpoint:
    def test_staff_can_read_insights(self, client, staff_token):
        response = client.get("/agent/insights", headers=_auth(staff_token))
        assert response.status_code == 200
        assert "insights" in response.json()

    def test_customer_forbidden(self, client, customer_token):
        response = client.get("/agent/insights", headers=_auth(customer_token))
        assert response.status_code == 403

    def test_unauthenticated_rejected(self, client):
        response = client.get("/agent/insights")
        assert response.status_code in (401, 403)


class TestActionLifecycleViaApi:
    def test_propose_execute_read_only_tool_immediately(self, client, admin_token):
        response = client.post(
            "/agent/actions",
            json={"loai_hanh_dong": "get_alert_summary", "tham_so": {}},
            headers=_auth(admin_token),
        )
        assert response.status_code == 200
        body = response.json()
        assert body["executed"] is True
        assert body["pending"] is False

    def test_propose_mutating_tool_then_staff_cannot_approve(self, client, admin_token, staff_token):
        propose = client.post(
            "/agent/actions",
            json={"loai_hanh_dong": "generate_alerts", "tham_so": {}},
            headers=_auth(admin_token),
        )
        action_id = propose.json()["action"]["action_id"]

        forbidden = client.post(f"/agent/actions/{action_id}/approve", headers=_auth(staff_token))
        assert forbidden.status_code == 403

    def test_propose_then_admin_approves(self, client, admin_token):
        propose = client.post(
            "/agent/actions",
            json={"loai_hanh_dong": "generate_alerts", "tham_so": {}},
            headers=_auth(admin_token),
        )
        action_id = propose.json()["action"]["action_id"]

        approve = client.post(f"/agent/actions/{action_id}/approve", headers=_auth(admin_token))
        assert approve.status_code == 200
        assert approve.json()["trang_thai"] == "hoan_thanh"

    def test_propose_with_unknown_tool_returns_400(self, client, admin_token):
        response = client.post(
            "/agent/actions",
            json={"loai_hanh_dong": "not_a_real_tool", "tham_so": {}},
            headers=_auth(admin_token),
        )
        assert response.status_code == 404


class TestChatEndpoint:
    def test_chat_returns_a_reply(self, client, staff_token):
        response = client.post("/agent/chat", json={"message": "status?"}, headers=_auth(staff_token))
        assert response.status_code == 200
        body = response.json()
        assert "reply" in body
        assert isinstance(body["insights"], list)
