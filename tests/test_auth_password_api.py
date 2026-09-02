from app.core.security import create_access_token, get_password_hash
from app.models import NguoiDung, VaiTro


def _user(db_session) -> NguoiDung:
    role = db_session.query(VaiTro).filter(VaiTro.ten_vai_tro == "customer").one()
    user = NguoiDung(
        ten_dang_nhap="password_api_user",
        email="password-api@example.com",
        mat_khau_ma_hoa=get_password_hash("current-password"),
        vaitro_id=role.vaitro_id,
        ho_ten="Password API User",
        dang_hoat_dong=True,
    )
    db_session.add(user)
    db_session.flush()
    return user


def _headers(user: NguoiDung) -> dict[str, str]:
    token = create_access_token({"sub": user.nguoidung_id})
    return {"Authorization": f"Bearer {token}"}


def test_change_password_requires_authentication(client):
    response = client.post(
        "/auth/change-password",
        json={
            "mat_khau_cu": "current-password",
            "mat_khau_moi": "new-password",
            "xac_nhan_mat_khau_moi": "new-password",
        },
    )

    assert response.status_code == 401


def test_change_password_rejects_confirmation_mismatch(client, db_session):
    user = _user(db_session)
    response = client.post(
        "/auth/change-password",
        headers=_headers(user),
        json={
            "mat_khau_cu": "current-password",
            "mat_khau_moi": "new-password",
            "xac_nhan_mat_khau_moi": "different-password",
        },
    )

    assert response.status_code == 400


def test_change_password_succeeds(client, db_session):
    user = _user(db_session)
    response = client.post(
        "/auth/change-password",
        headers=_headers(user),
        json={
            "mat_khau_cu": "current-password",
            "mat_khau_moi": "new-password",
            "xac_nhan_mat_khau_moi": "new-password",
        },
    )

    assert response.status_code == 204
    login = client.post(
        "/auth/login",
        data={"username": user.email, "password": "new-password"},
    )
    assert login.status_code == 200
