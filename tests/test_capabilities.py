from app.core.capabilities import capabilities_for
from app.core.security import create_access_token
from app.models import NguoiDung, VaiTro


def test_capabilities_follow_role_tiers():
    assert "admin.access" in capabilities_for("staff")
    assert "products.write" not in capabilities_for("staff")
    assert "dashboard.read" in capabilities_for("manager")
    assert "users.manage" not in capabilities_for("manager")
    assert capabilities_for("customer") == []


def test_auth_me_exposes_backend_capabilities(client, db_session):
    role = VaiTro(ten_vai_tro="staff")
    db_session.add(role)
    db_session.flush()
    user = NguoiDung(
        ten_dang_nhap="capability_api_staff",
        email="capability_api_staff@example.com",
        mat_khau_ma_hoa="hashed",
        vaitro_id=role.vaitro_id,
        ho_ten="Capability API Staff",
    )
    db_session.add(user)
    db_session.flush()

    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {create_access_token({'sub': user.nguoidung_id})}"},
    )

    assert response.status_code == 200
    assert response.json()["capabilities"] == capabilities_for("staff")
