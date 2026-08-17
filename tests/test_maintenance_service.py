"""
Tests for app.services.maintenance.MaintenanceService — the two scheduled
jobs wired up in app/scheduler.py. See maintenance_service.py's module
docstring for why these exist (docs/specs/03-payments.md Finding #3,
docs/specs/04-inventory.md Finding #1).

Only sweep_stale_pending_payments gets dedicated tests here —
run_daily_alert_scan is a thin passthrough to AlertService.generate_alerts,
which already has its own coverage in test_alert_service.py.
"""

from datetime import timedelta
from decimal import Decimal

import pytest

from app.core.time import utc_now
from app.models import DonHang, NguoiDung, ThanhToan, VaiTro
from app.services.maintenance import MaintenanceService


@pytest.fixture()
def service() -> MaintenanceService:
    return MaintenanceService()


@pytest.fixture()
def role_customer(db_session):
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
        ho_ten=f"Test User {suffix}",
    )
    db_session.add(user)
    db_session.flush()
    return user


def _make_order(db_session, owner, suffix: str, trang_thai: str = "cho") -> DonHang:
    order = DonHang(
        ma_don_hang=f"ORD-SWEEP-{suffix}",
        nguoidung_id=owner.nguoidung_id,
        loai_don="online",
        tong_tien=Decimal("50000"),
        tien_thanh_toan=Decimal("50000"),
        trang_thai=trang_thai,
    )
    db_session.add(order)
    db_session.flush()
    return order


def _make_payment(db_session, order, trang_thai: str, age_minutes: int) -> ThanhToan:
    payment = ThanhToan(
        donhang_id=order.donhang_id,
        phuong_thuc="vi_dien_tu",
        so_tien=Decimal("50000"),
        trang_thai=trang_thai,
        ngay_tao=utc_now() - timedelta(minutes=age_minutes),
    )
    db_session.add(payment)
    db_session.commit()
    return payment


class TestSweepStalePendingPayments:
    def test_cancels_order_stuck_pending_past_threshold(self, db_session, service, role_customer):
        customer = _make_user(db_session, role_customer, "stale1")
        order = _make_order(db_session, customer, "stale1")
        _make_payment(db_session, order, "dang_xu_ly", age_minutes=45)

        result = service.sweep_stale_pending_payments(db_session, stale_after_minutes=30)

        assert result["swept"] == 1
        assert order.donhang_id in result["order_ids"]
        assert result["errors"] == []
        db_session.refresh(order)
        assert order.trang_thai == "da_huy"

    def test_leaves_fresh_pending_payment_alone(self, db_session, service, role_customer):
        customer = _make_user(db_session, role_customer, "fresh1")
        order = _make_order(db_session, customer, "fresh1")
        _make_payment(db_session, order, "dang_xu_ly", age_minutes=5)

        result = service.sweep_stale_pending_payments(db_session, stale_after_minutes=30)

        assert result["swept"] == 0
        db_session.refresh(order)
        assert order.trang_thai == "cho"

    def test_ignores_payments_not_in_pending_status(self, db_session, service, role_customer):
        customer = _make_user(db_session, role_customer, "settled1")
        order = _make_order(db_session, customer, "settled1", trang_thai="hoan_thanh")
        _make_payment(db_session, order, "thanh_cong", age_minutes=999)

        result = service.sweep_stale_pending_payments(db_session, stale_after_minutes=30)

        assert result["swept"] == 0
        db_session.refresh(order)
        assert order.trang_thai == "hoan_thanh"

    def test_already_cancelled_order_is_a_no_op_not_an_error(self, db_session, service, role_customer):
        customer = _make_user(db_session, role_customer, "already-cancelled")
        order = _make_order(db_session, customer, "already-cancelled", trang_thai="da_huy")
        _make_payment(db_session, order, "dang_xu_ly", age_minutes=45)

        result = service.sweep_stale_pending_payments(db_session, stale_after_minutes=30)

        # fail_unpaid_order() no-ops for already-cancelled orders — swept
        # still counts it as "handled" (order.donhang_id gets appended)
        # rather than erroring, since nothing actually went wrong.
        assert result["errors"] == []
