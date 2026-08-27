"""
Tests for app.services.users.UserService — Phase 1 service-layer migration
(see app/services/users/user_service.py module docstring).

Focused on the permission logic: self-vs-other profile updates, role
changes restricted to admin, and the "can't delete yourself" guard — these
are the parts most likely to regress silently in a refactor since they're
authorization checks, not just data shuffling.
"""
import pytest

from app.models import NguoiDung, VaiTro
from app.services.users import DomainError, UserService


@pytest.fixture()
def service() -> UserService:
    return UserService()


@pytest.fixture()
def admin_role(db_session):
    role = VaiTro(ten_vai_tro="admin")
    db_session.add(role)
    db_session.flush()
    return role


@pytest.fixture()
def customer_role(db_session):
    role = VaiTro(ten_vai_tro="customer_test")
    db_session.add(role)
    db_session.flush()
    return role


def _make_user(db_session, role, suffix: str) -> NguoiDung:
    user = NguoiDung(
        ten_dang_nhap=f"user_{suffix}",
        email=f"user_{suffix}@example.com",
        mat_khau_ma_hoa="hashed",
        vaitro_id=role.vaitro_id,
        ho_ten=f"User {suffix}",
    )
    db_session.add(user)
    db_session.flush()
    return user


class _UserCreatePayload:
    def __init__(self, ten_dang_nhap, email, vaitro_id):
        self.ten_dang_nhap = ten_dang_nhap
        self.email = email
        self.mat_khau = "password123"
        self.ho_ten = "New User"
        self.vaitro_id = vaitro_id
        self.so_dien_thoai = None
        self.dia_chi = None
        self.ngay_sinh = None
        self.gioi_tinh = None


class _UserUpdatePayload:
    def __init__(self, **fields):
        self._fields = fields

    def model_dump(self, exclude_unset=True):
        return dict(self._fields)


class TestCreateUser:
    def test_rejects_duplicate_username_or_email(self, db_session, service, customer_role):
        service.create_user(db_session, _UserCreatePayload("dup_user", "dup@example.com", customer_role.vaitro_id))
        with pytest.raises(DomainError) as exc_info:
            service.create_user(db_session, _UserCreatePayload("dup_user", "different@example.com", customer_role.vaitro_id))
        assert exc_info.value.status_code == 400

    def test_rejects_unknown_role(self, db_session, service):
        with pytest.raises(DomainError) as exc_info:
            service.create_user(db_session, _UserCreatePayload("someone", "someone@example.com", vaitro_id=999999))
        assert exc_info.value.status_code == 404

    def test_password_is_hashed_not_stored_raw(self, db_session, service, customer_role):
        result = service.create_user(db_session, _UserCreatePayload("hashcheck", "hashcheck@example.com", customer_role.vaitro_id))
        user = db_session.query(NguoiDung).filter(NguoiDung.nguoidung_id == result["nguoidung_id"]).first()
        assert user.mat_khau_ma_hoa != "password123"


class TestUpdateUser:
    def test_user_can_update_own_profile(self, db_session, service, customer_role):
        user = _make_user(db_session, customer_role, "self")
        result = service.update_user(db_session, user.nguoidung_id, _UserUpdatePayload(ho_ten="Tên mới"), user)
        assert result["ho_ten"] == "Tên mới"

    def test_regular_user_cannot_update_others_profile(self, db_session, service, customer_role):
        victim = _make_user(db_session, customer_role, "victim")
        attacker = _make_user(db_session, customer_role, "attacker")

        with pytest.raises(DomainError) as exc_info:
            service.update_user(db_session, victim.nguoidung_id, _UserUpdatePayload(ho_ten="Hacked"), attacker)
        assert exc_info.value.status_code == 403

    def test_admin_can_update_any_profile(self, db_session, service, customer_role, admin_role):
        target = _make_user(db_session, customer_role, "target")
        admin = _make_user(db_session, admin_role, "admin")

        result = service.update_user(db_session, target.nguoidung_id, _UserUpdatePayload(ho_ten="Admin edited"), admin)
        assert result["ho_ten"] == "Admin edited"

    def test_non_admin_cannot_change_own_role(self, db_session, service, customer_role):
        user = _make_user(db_session, customer_role, "roleself")
        with pytest.raises(DomainError) as exc_info:
            service.update_user(db_session, user.nguoidung_id, _UserUpdatePayload(vaitro_id=customer_role.vaitro_id), user)
        assert exc_info.value.status_code == 403

    def test_admin_can_change_role(self, db_session, service, customer_role, admin_role):
        target = _make_user(db_session, customer_role, "rolechange")
        admin = _make_user(db_session, admin_role, "roleadmin")

        result = service.update_user(db_session, target.nguoidung_id, _UserUpdatePayload(vaitro_id=admin_role.vaitro_id), admin)
        assert result["vaitro"]["ten_vai_tro"] == "admin"


class TestDeleteUser:
    def test_cannot_delete_self(self, db_session, service, admin_role):
        admin = _make_user(db_session, admin_role, "selfdelete")
        with pytest.raises(DomainError) as exc_info:
            service.delete_user(db_session, admin.nguoidung_id, admin)
        assert exc_info.value.status_code == 400

    def test_admin_can_delete_other_user(self, db_session, service, admin_role, customer_role):
        admin = _make_user(db_session, admin_role, "deleter")
        target = _make_user(db_session, customer_role, "deletee")

        service.delete_user(db_session, target.nguoidung_id, admin)

        # Soft-delete: the row survives (deactivated), it isn't hard-removed.
        # See app/services/users/user_service.py delete_user docstring — a
        # real DB delete here would raise IntegrityError for any user who
        # has ever touched the inventory ledger.
        remaining = db_session.query(NguoiDung).filter(NguoiDung.nguoidung_id == target.nguoidung_id).first()
        assert remaining is not None
        assert remaining.dang_hoat_dong is False


class TestUploadAvatar:
    def test_avatar_bytes_and_content_type_persist_in_database(self, db_session, service, customer_role):
        user = _make_user(db_session, customer_role, "avatar")

        avatar_url = service.upload_avatar(
            db_session,
            user.nguoidung_id,
            user,
            "image/png",
            "profile.png",
            b"png-bytes",
        )

        db_session.expire_all()
        persisted = db_session.query(NguoiDung).filter(NguoiDung.nguoidung_id == user.nguoidung_id).one()

        assert avatar_url == f"/users/{user.nguoidung_id}/avatar"
        assert persisted.avatar_url == avatar_url
        assert persisted.avatar_data == b"png-bytes"
        assert persisted.avatar_content_type == "image/png"

    def test_avatar_endpoint_serves_persisted_bytes(self, db_session, client, service, customer_role):
        user = _make_user(db_session, customer_role, "avatar_endpoint")
        service.upload_avatar(
            db_session,
            user.nguoidung_id,
            user,
            "image/webp",
            "profile.webp",
            b"webp-bytes",
        )

        response = client.get(f"/users/{user.nguoidung_id}/avatar")

        assert response.status_code == 200
        assert response.headers["content-type"] == "image/webp"
        assert response.content == b"webp-bytes"
