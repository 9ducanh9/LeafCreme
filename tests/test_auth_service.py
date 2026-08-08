"""
Tests for app.services.auth.AuthService — Phase 1 service-layer migration
(see app/services/auth/auth_service.py module docstring).

Security-sensitive logic gets full coverage here, not the lighter treatment
given to lower-stakes routers in this migration: wrong-password and
unknown-user must be indistinguishable (401, same message), disabled
accounts must be blocked even with the right password, and refresh tokens
must be validated by type (a stolen access token shouldn't work as a
refresh token).
"""
from datetime import date

import pytest

from app.core.security import create_access_token, create_refresh_token, get_password_hash
from app.models import NguoiDung, VaiTro
from app.services.auth import AuthService, DomainError
from app.services.auth.auth_service import parse_date_vietnam


@pytest.fixture()
def service() -> AuthService:
    return AuthService()


@pytest.fixture()
def customer_role(db_session):
    role = VaiTro(ten_vai_tro="customer_test")
    db_session.add(role)
    db_session.flush()
    return role


def _make_user(db_session, role, password="correct-password", active=True):
    user = NguoiDung(
        ten_dang_nhap="authtest",
        email="authtest@example.com",
        mat_khau_ma_hoa=get_password_hash(password),
        vaitro_id=role.vaitro_id,
        ho_ten="Auth Test",
        dang_hoat_dong=active,
    )
    db_session.add(user)
    db_session.flush()
    return user


class _RegisterPayload:
    def __init__(self, vaitro_id, ten_dang_nhap="newuser", email="newuser@example.com", ngay_sinh=None):
        self.ten_dang_nhap = ten_dang_nhap
        self.email = email
        self.mat_khau = "password123"
        self.ho_ten = "New User"
        self.vaitro_id = vaitro_id
        self.so_dien_thoai = None
        self.dia_chi = None
        self.ngay_sinh = ngay_sinh
        self.gioi_tinh = None


class TestLogin:
    def test_wrong_password_rejected(self, db_session, service, customer_role):
        _make_user(db_session, customer_role, password="correct-password")
        with pytest.raises(DomainError) as exc_info:
            service.login(db_session, "authtest", "wrong-password")
        assert exc_info.value.status_code == 401

    def test_unknown_username_rejected_with_same_message_as_wrong_password(self, db_session, service, customer_role):
        _make_user(db_session, customer_role, password="correct-password")

        with pytest.raises(DomainError) as wrong_pw:
            service.login(db_session, "authtest", "wrong-password")
        with pytest.raises(DomainError) as unknown_user:
            service.login(db_session, "no_such_user", "anything")

        # Must not leak which failure mode it was.
        assert wrong_pw.value.status_code == unknown_user.value.status_code == 401
        assert wrong_pw.value.detail == unknown_user.value.detail

    def test_can_login_with_email_instead_of_username(self, db_session, service, customer_role):
        _make_user(db_session, customer_role, password="correct-password")
        result = service.login(db_session, "authtest@example.com", "correct-password")
        assert result["ten_dang_nhap"] == "authtest"

    def test_disabled_account_rejected_even_with_correct_password(self, db_session, service, customer_role):
        _make_user(db_session, customer_role, password="correct-password", active=False)
        with pytest.raises(DomainError) as exc_info:
            service.login(db_session, "authtest", "correct-password")
        assert exc_info.value.status_code == 403

    def test_successful_login_updates_last_login_timestamp(self, db_session, service, customer_role):
        user = _make_user(db_session, customer_role, password="correct-password")
        assert user.lan_dang_nhap_cuoi is None

        service.login(db_session, "authtest", "correct-password")
        db_session.refresh(user)
        assert user.lan_dang_nhap_cuoi is not None

    def test_successful_login_returns_role_name(self, db_session, service, customer_role):
        _make_user(db_session, customer_role, password="correct-password")
        result = service.login(db_session, "authtest", "correct-password")
        assert result["vaitro"] == "customer_test"
        assert result["token_type"] == "bearer"


class TestRegister:
    def test_rejects_duplicate_username_or_email(self, db_session, service, customer_role):
        service.register(db_session, _RegisterPayload(customer_role.vaitro_id, ten_dang_nhap="dup1", email="dup1@example.com"))
        with pytest.raises(DomainError) as exc_info:
            service.register(db_session, _RegisterPayload(customer_role.vaitro_id, ten_dang_nhap="dup1", email="different@example.com"))
        assert exc_info.value.status_code == 400

    def test_rejects_unknown_role(self, db_session, service):
        with pytest.raises(DomainError) as exc_info:
            service.register(db_session, _RegisterPayload(vaitro_id=999999))
        assert exc_info.value.status_code == 404

    def test_rejects_invalid_birthdate_format(self, db_session, service, customer_role):
        with pytest.raises(DomainError) as exc_info:
            service.register(db_session, _RegisterPayload(customer_role.vaitro_id, ngay_sinh="not-a-date"))
        assert exc_info.value.status_code == 400

    def test_accepts_vietnamese_date_format(self, db_session, service, customer_role):
        result = service.register(db_session, _RegisterPayload(customer_role.vaitro_id, ngay_sinh="16/10/2004"))
        user = db_session.query(NguoiDung).filter(NguoiDung.nguoidung_id == result["user_id"]).first()
        assert user.ngay_sinh == date(2004, 10, 16)


class TestRefreshToken:
    def test_rejects_access_token_used_as_refresh_token(self, db_session, service, customer_role):
        user = _make_user(db_session, customer_role)
        access_token = create_access_token(data={"sub": user.nguoidung_id})

        with pytest.raises(DomainError) as exc_info:
            service.refresh_token(db_session, access_token)
        assert exc_info.value.status_code == 401

    def test_rejects_token_for_disabled_user(self, db_session, service, customer_role):
        user = _make_user(db_session, customer_role, active=True)
        refresh = create_refresh_token(data={"sub": user.nguoidung_id})

        user.dang_hoat_dong = False
        db_session.commit()

        with pytest.raises(DomainError) as exc_info:
            service.refresh_token(db_session, refresh)
        assert exc_info.value.status_code == 401

    def test_valid_refresh_token_issues_new_tokens(self, db_session, service, customer_role):
        user = _make_user(db_session, customer_role)
        refresh = create_refresh_token(data={"sub": user.nguoidung_id})

        result = service.refresh_token(db_session, refresh)
        assert result["user_id"] == user.nguoidung_id
        assert result["access_token"]


class TestParseDateVietnam:
    def test_parses_vietnamese_format(self):
        assert parse_date_vietnam("16/10/2004") == date(2004, 10, 16)

    def test_parses_iso_format(self):
        assert parse_date_vietnam("2004-10-16") == date(2004, 10, 16)

    def test_rejects_garbage(self):
        with pytest.raises(ValueError):
            parse_date_vietnam("not-a-date")

    def test_empty_string_returns_none(self):
        assert parse_date_vietnam("") is None
