"""
Tests for app.services.payments.PaymentService — Phase 1 service-layer
migration (see LeafCreme_Restructure_Plan.md section 2.2 and the module
docstring in app/services/payments/payment_service.py).

These exercise the service directly against a real (SAVEPOINT-wrapped)
Postgres session rather than going through the HTTP layer, per the plan's
"cover services/ (business logic) first" testing priority. Requires
DATABASE_URL/TEST_DATABASE_URL (see tests/conftest.py) — skipped otherwise,
same as the rest of the suite.
"""
from decimal import Decimal

import pytest

from app.models import DonHang, NguoiDung, ThanhToan, VaiTro
from app.services.payments import DomainError, PaymentService


@pytest.fixture()
def role_customer(db_session):
    role = VaiTro(ten_vai_tro="customer_test")
    db_session.add(role)
    db_session.flush()
    return role


@pytest.fixture()
def role_admin(db_session):
    role = VaiTro(ten_vai_tro="admin")
    db_session.add(role)
    db_session.flush()
    return role


def _make_user(db_session, role, suffix: str) -> NguoiDung:
    user = NguoiDung(
        ten_dang_nhap=f"user_{suffix}",
        email=f"user_{suffix}@example.com",
        mat_khau_ma_hoa="hashed",
        vaitro_id=role.vaitro_id,
        ho_ten=f"Test User {suffix}",
    )
    db_session.add(user)
    db_session.flush()
    return user


def _make_order(db_session, owner: NguoiDung, tien_thanh_toan: Decimal, suffix: str) -> DonHang:
    order = DonHang(
        ma_don_hang=f"ORD-TEST-{suffix}",
        nguoidung_id=owner.nguoidung_id,
        loai_don="online",
        tong_tien=tien_thanh_toan,
        tien_thanh_toan=tien_thanh_toan,
        trang_thai="cho",
    )
    db_session.add(order)
    db_session.flush()
    return order


@pytest.fixture()
def service() -> PaymentService:
    return PaymentService()


class TestCreatePayment:
    def test_cash_payment_for_full_amount_completes_order(self, db_session, role_customer, service):
        customer = _make_user(db_session, role_customer, "buyer1")
        order = _make_order(db_session, customer, Decimal("100000"), "cash-full")

        class Payload:
            donhang_id = order.donhang_id
            phuong_thuc = "tien_mat"
            so_tien = Decimal("100000")
            ma_giao_dich = None
            thong_tin_giao_dich = None

        result = service.create_payment(db_session, Payload(), customer)

        assert result["trang_thai"] == "thanh_cong"
        db_session.refresh(order)
        assert order.trang_thai == "hoan_thanh"

    def test_rejects_amount_over_remaining_balance(self, db_session, role_customer, service):
        customer = _make_user(db_session, role_customer, "buyer2")
        order = _make_order(db_session, customer, Decimal("50000"), "cash-over")

        class Payload:
            donhang_id = order.donhang_id
            phuong_thuc = "tien_mat"
            so_tien = Decimal("999999")
            ma_giao_dich = None
            thong_tin_giao_dich = None

        with pytest.raises(DomainError) as exc_info:
            service.create_payment(db_session, Payload(), customer)
        assert exc_info.value.status_code == 400

    def test_rejects_invalid_payment_method(self, db_session, role_customer, service):
        customer = _make_user(db_session, role_customer, "buyer3")
        order = _make_order(db_session, customer, Decimal("50000"), "bad-method")

        class Payload:
            donhang_id = order.donhang_id
            phuong_thuc = "bitcoin"
            so_tien = Decimal("50000")
            ma_giao_dich = None
            thong_tin_giao_dich = None

        with pytest.raises(DomainError) as exc_info:
            service.create_payment(db_session, Payload(), customer)
        assert exc_info.value.status_code == 400

    def test_forbidden_for_another_customers_order(self, db_session, role_customer, service):
        owner = _make_user(db_session, role_customer, "owner")
        other = _make_user(db_session, role_customer, "intruder")
        order = _make_order(db_session, owner, Decimal("50000"), "forbidden")

        class Payload:
            donhang_id = order.donhang_id
            phuong_thuc = "tien_mat"
            so_tien = Decimal("50000")
            ma_giao_dich = None
            thong_tin_giao_dich = None

        with pytest.raises(DomainError) as exc_info:
            service.create_payment(db_session, Payload(), other)
        assert exc_info.value.status_code == 403

    def test_admin_can_pay_for_any_customers_order(self, db_session, role_customer, role_admin, service):
        owner = _make_user(db_session, role_customer, "owner2")
        admin = _make_user(db_session, role_admin, "admin1")
        order = _make_order(db_session, owner, Decimal("50000"), "admin-pay")

        class Payload:
            donhang_id = order.donhang_id
            phuong_thuc = "tien_mat"
            so_tien = Decimal("50000")
            ma_giao_dich = None
            thong_tin_giao_dich = None

        result = service.create_payment(db_session, Payload(), admin)
        assert result["trang_thai"] == "thanh_cong"


class TestUpdatePaymentStatus:
    def test_transition_to_success_completes_order_when_fully_paid(self, db_session, role_customer, service):
        customer = _make_user(db_session, role_customer, "buyer4")
        order = _make_order(db_session, customer, Decimal("70000"), "status-transition")
        payment = ThanhToan(
            donhang_id=order.donhang_id,
            phuong_thuc="chuyen_khoan",
            so_tien=Decimal("70000"),
            trang_thai="dang_xu_ly",
        )
        db_session.add(payment)
        db_session.flush()

        class Payload:
            trang_thai = "thanh_cong"
            ma_giao_dich = None
            thong_tin_giao_dich = None
            ngay_thanh_toan = None

        result = service.update_payment_status(db_session, payment.thanhtoan_id, Payload(), customer)

        assert result["trang_thai"] == "thanh_cong"
        db_session.refresh(order)
        assert order.trang_thai == "hoan_thanh"

    def test_rejects_invalid_status_value(self, db_session, role_customer, service):
        customer = _make_user(db_session, role_customer, "buyer5")
        order = _make_order(db_session, customer, Decimal("30000"), "bad-status")
        payment = ThanhToan(
            donhang_id=order.donhang_id,
            phuong_thuc="chuyen_khoan",
            so_tien=Decimal("30000"),
            trang_thai="dang_xu_ly",
        )
        db_session.add(payment)
        db_session.flush()

        class Payload:
            trang_thai = "not_a_real_status"
            ma_giao_dich = None
            thong_tin_giao_dich = None
            ngay_thanh_toan = None

        with pytest.raises(DomainError) as exc_info:
            service.update_payment_status(db_session, payment.thanhtoan_id, Payload(), customer)
        assert exc_info.value.status_code == 400


class TestMomoIpn:
    def test_invalid_signature_returns_result_code_97(self, db_session, service, monkeypatch):
        monkeypatch.setattr(
            "app.services.payments.payment_service.verify_signature",
            lambda body, secret: (False, ""),
        )
        result = service.handle_momo_ipn(db_session, {"orderId": "1", "amount": 1000})
        assert result["resultCode"] == 97

    def test_amount_mismatch_returns_result_code_4(self, db_session, role_customer, service, monkeypatch):
        monkeypatch.setattr(
            "app.services.payments.payment_service.verify_signature",
            lambda body, secret: (True, ""),
        )
        customer = _make_user(db_session, role_customer, "buyer6")
        order = _make_order(db_session, customer, Decimal("100000"), "momo-mismatch")
        payment = ThanhToan(
            donhang_id=order.donhang_id,
            phuong_thuc="vi_dien_tu",
            so_tien=Decimal("100000"),
            trang_thai="dang_xu_ly",
        )
        db_session.add(payment)
        db_session.flush()

        result = service.handle_momo_ipn(db_session, {
            "orderId": str(payment.thanhtoan_id),
            "amount": 1,  # wrong on purpose
            "resultCode": 0,
        })
        assert result["resultCode"] == 4

    def test_success_marks_payment_and_order_complete(self, db_session, role_customer, service, monkeypatch):
        monkeypatch.setattr(
            "app.services.payments.payment_service.verify_signature",
            lambda body, secret: (True, ""),
        )
        customer = _make_user(db_session, role_customer, "buyer7")
        order = _make_order(db_session, customer, Decimal("100000"), "momo-success")
        payment = ThanhToan(
            donhang_id=order.donhang_id,
            phuong_thuc="vi_dien_tu",
            so_tien=Decimal("100000"),
            trang_thai="dang_xu_ly",
        )
        db_session.add(payment)
        db_session.flush()

        result = service.handle_momo_ipn(db_session, {
            "orderId": str(payment.thanhtoan_id),
            "amount": 100000,
            "resultCode": 0,
            "transId": "MOMO123",
        })

        assert result["resultCode"] == 0
        db_session.refresh(payment)
        db_session.refresh(order)
        assert payment.trang_thai == "thanh_cong"
        assert order.trang_thai == "hoan_thanh"
