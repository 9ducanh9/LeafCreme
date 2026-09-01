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
from urllib.parse import parse_qs, urlparse

import pytest

from app.models import DonHang, NguoiDung, ThanhToan, VaiTro
from app.core.config import settings
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


@pytest.fixture()
def role_staff(db_session):
    role = VaiTro(ten_vai_tro="staff")
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


def _make_order(db_session, owner: NguoiDung, tien_thanh_toan: Decimal, suffix: str, creator: NguoiDung | None = None) -> DonHang:
    order = DonHang(
        ma_don_hang=f"ORD-TEST-{suffix}",
        nguoidung_id=owner.nguoidung_id,
        nhan_vien_tao=creator.nguoidung_id if creator else None,
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
    def test_cash_payment_for_full_amount_completes_order(self, db_session, role_customer, role_staff, service):
        customer = _make_user(db_session, role_customer, "buyer1")
        staff = _make_user(db_session, role_staff, "cashier1")
        order = _make_order(db_session, customer, Decimal("100000"), "cash-full", creator=staff)

        class Payload:
            donhang_id = order.donhang_id
            phuong_thuc = "tien_mat"
            so_tien = Decimal("100000")
            ma_giao_dich = None
            thong_tin_giao_dich = None

        result = service.create_payment(db_session, Payload(), staff)

        assert result["trang_thai"] == "thanh_cong"
        db_session.refresh(order)
        assert order.trang_thai == "hoan_thanh"

    def test_customer_cannot_create_manual_payment(self, db_session, role_customer, service):
        customer = _make_user(db_session, role_customer, "buyer-manual-forbidden")
        order = _make_order(db_session, customer, Decimal("100000"), "manual-forbidden")

        class Payload:
            donhang_id = order.donhang_id
            phuong_thuc = "tien_mat"
            so_tien = Decimal("100000")
            ma_giao_dich = None
            thong_tin_giao_dich = None

        with pytest.raises(DomainError) as exc_info:
            service.create_payment(db_session, Payload(), customer)

        assert exc_info.value.status_code == 403
        assert db_session.query(ThanhToan).filter(ThanhToan.donhang_id == order.donhang_id).count() == 0
        db_session.refresh(order)
        assert order.trang_thai == "cho"

    def test_rejects_amount_over_remaining_balance(self, db_session, role_customer, role_staff, service):
        customer = _make_user(db_session, role_customer, "buyer2")
        staff = _make_user(db_session, role_staff, "cashier2")
        order = _make_order(db_session, customer, Decimal("50000"), "cash-over", creator=staff)

        class Payload:
            donhang_id = order.donhang_id
            phuong_thuc = "tien_mat"
            so_tien = Decimal("999999")
            ma_giao_dich = None
            thong_tin_giao_dich = None

        with pytest.raises(DomainError) as exc_info:
            service.create_payment(db_session, Payload(), staff)
        assert exc_info.value.status_code == 400

    def test_rejects_invalid_payment_method(self, db_session, role_customer, role_staff, service):
        customer = _make_user(db_session, role_customer, "buyer3")
        staff = _make_user(db_session, role_staff, "cashier3")
        order = _make_order(db_session, customer, Decimal("50000"), "bad-method", creator=staff)

        class Payload:
            donhang_id = order.donhang_id
            phuong_thuc = "bitcoin"
            so_tien = Decimal("50000")
            ma_giao_dich = None
            thong_tin_giao_dich = None

        with pytest.raises(DomainError) as exc_info:
            service.create_payment(db_session, Payload(), staff)
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

    def test_staff_cannot_read_or_pay_another_staff_members_order(self, db_session, role_customer, role_staff, service):
        customer = _make_user(db_session, role_customer, "payment-scope-customer")
        staff_a = _make_user(db_session, role_staff, "payment-scope-a")
        staff_b = _make_user(db_session, role_staff, "payment-scope-b")
        order = _make_order(db_session, customer, Decimal("50000"), "payment-scope", creator=staff_a)
        payment = ThanhToan(
            donhang_id=order.donhang_id,
            phuong_thuc="tien_mat",
            so_tien=Decimal("10000"),
            trang_thai="dang_xu_ly",
        )
        db_session.add(payment)
        db_session.flush()

        assert service.list_payments(db_session, staff_b) == []
        with pytest.raises(DomainError) as exc_info:
            service.get_order_payments(db_session, order.donhang_id, staff_b)
        assert exc_info.value.status_code == 403

        class Payload:
            donhang_id = order.donhang_id
            phuong_thuc = "tien_mat"
            so_tien = Decimal("10000")
            ma_giao_dich = None
            thong_tin_giao_dich = None

        with pytest.raises(DomainError) as exc_info:
            service.create_payment(db_session, Payload(), staff_b)
        assert exc_info.value.status_code == 403


class TestUpdatePaymentStatus:
    def test_transition_to_success_completes_order_when_fully_paid(self, db_session, role_customer, role_manager, service):
        customer = _make_user(db_session, role_customer, "buyer4")
        manager = _make_user(db_session, role_manager, "manager1")
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

        result = service.update_payment_status(db_session, payment.thanhtoan_id, Payload(), manager)

        assert result["trang_thai"] == "thanh_cong"
        db_session.refresh(order)
        assert order.trang_thai == "hoan_thanh"

    def test_rejects_invalid_status_value(self, db_session, role_customer, role_manager, service):
        customer = _make_user(db_session, role_customer, "buyer5")
        manager = _make_user(db_session, role_manager, "manager2")
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
            service.update_payment_status(db_session, payment.thanhtoan_id, Payload(), manager)
        assert exc_info.value.status_code == 400


class TestSePay:
    @staticmethod
    def _configure(monkeypatch):
        monkeypatch.setattr(settings, "SEPAY_BANK_ACCOUNT", "0123456789")
        monkeypatch.setattr(settings, "SEPAY_BANK_CODE", "MB")
        monkeypatch.setattr(settings, "SEPAY_ACCOUNT_NAME", "LAM CHI TAI")
        monkeypatch.setattr(settings, "SEPAY_QR_BASE_URL", "https://vietqr.app/img")

    def _create_payment(self, db_session, role_customer, service, monkeypatch, amount="260000"):
        self._configure(monkeypatch)
        customer = _make_user(db_session, role_customer, f"sepay-{amount}")
        order = _make_order(db_session, customer, Decimal(amount), f"sepay-{amount}")

        class Payload:
            donhang_id = order.donhang_id

        result = service.create_sepay_payment(db_session, Payload(), customer)
        payment = db_session.query(ThanhToan).filter(
            ThanhToan.thanhtoan_id == result["payment_id"]
        ).one()
        return result, payment, order

    def test_dynamic_qr_contains_amount_and_payment_code(
        self, db_session, role_customer, service, monkeypatch
    ):
        result, payment, _ = self._create_payment(db_session, role_customer, service, monkeypatch)

        params = parse_qs(urlparse(result["qr_image"]).query)
        assert result["method"] == "sepay"
        assert result["transfer_content"] == f"LC{payment.thanhtoan_id}"
        assert params["amount"] == ["260000"]
        assert params["des"] == [f"LC{payment.thanhtoan_id}"]
        assert payment.phuong_thuc == "chuyen_khoan"
        assert payment.trang_thai == "dang_xu_ly"

    def test_amount_mismatch_keeps_payment_pending(
        self, db_session, role_customer, service, monkeypatch
    ):
        _, payment, _ = self._create_payment(db_session, role_customer, service, monkeypatch)

        result = service.handle_sepay_webhook(db_session, {
            "id": 91001,
            "accountNumber": "0123456789",
            "transferType": "in",
            "transferAmount": 1,
            "code": f"LC{payment.thanhtoan_id}",
            "content": "",
        })

        db_session.refresh(payment)
        assert result["success"] is True
        assert result["message"] == "Transfer amount mismatch"
        assert payment.trang_thai == "dang_xu_ly"

    def test_account_mismatch_keeps_payment_pending(
        self, db_session, role_customer, service, monkeypatch
    ):
        _, payment, _ = self._create_payment(db_session, role_customer, service, monkeypatch)

        result = service.handle_sepay_webhook(db_session, {
            "id": 91003,
            "accountNumber": "0000000000",
            "transferType": "in",
            "transferAmount": 260000,
            "code": f"LC{payment.thanhtoan_id}",
            "content": "",
        })

        db_session.refresh(payment)
        assert result == {"success": True, "message": "Receiving account mismatch"}
        assert payment.trang_thai == "dang_xu_ly"

    def test_webhook_confirms_payment_and_is_idempotent(
        self, db_session, role_customer, service, monkeypatch
    ):
        _, payment, order = self._create_payment(db_session, role_customer, service, monkeypatch, "100000")
        payload = {
            "id": 91002,
            "gateway": "MBBank",
            "transactionDate": "2026-08-29 10:30:00",
            "accountNumber": "0123456789",
            "transferType": "in",
            "transferAmount": 100000,
            "code": f"LC{payment.thanhtoan_id}",
            "content": f"Thanh toan LC{payment.thanhtoan_id}",
            "referenceCode": "FT2612345678",
        }

        first = service.handle_sepay_webhook(db_session, payload)
        second = service.handle_sepay_webhook(db_session, payload)

        db_session.refresh(payment)
        db_session.refresh(order)
        assert first["message"] == "Payment confirmed"
        assert second["message"] == "Transaction already processed"
        assert payment.trang_thai == "thanh_cong"
        assert payment.ma_giao_dich == "SEPAY-91002"
        assert order.trang_thai == "hoan_thanh"


class TestSePayWebhookRoute:
    def test_rejects_invalid_api_key(self, client, monkeypatch):
        monkeypatch.setattr(settings, "SEPAY_WEBHOOK_API_KEY", "expected-secret")
        payload = {
            "id": 92001,
            "gateway": "MBBank",
            "transactionDate": "2026-08-29 10:30:00",
            "accountNumber": "0123456789",
            "transferType": "in",
            "transferAmount": 100000,
        }

        response = client.post(
            "/payments/sepay/webhook",
            headers={"Authorization": "Apikey wrong-secret"},
            json=payload,
        )

        assert response.status_code == 401
