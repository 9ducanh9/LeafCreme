"""
Tests for app.services.reports.ReportService — Phase 1 service-layer
migration (see app/services/reports/report_service.py).
"""
from datetime import date, datetime
from decimal import Decimal

import pytest

from app.models import ChiTietDonHang, DonHang
from app.services.reports import DomainError, ReportService


@pytest.fixture()
def service() -> ReportService:
    return ReportService()


def _make_completed_order(db_session, ma_don_hang, ngay_tao, tong_tien, so_luong_item=2):
    order = DonHang(
        ma_don_hang=ma_don_hang,
        tong_tien=tong_tien,
        tien_thanh_toan=tong_tien,
        trang_thai="hoan_thanh",
        ngay_tao=ngay_tao,
    )
    db_session.add(order)
    db_session.flush()

    item = ChiTietDonHang(
        donhang_id=order.donhang_id,
        so_luong=so_luong_item,
        gia_don_vi=Decimal("10000"),
        tong_tien_phu=Decimal("20000"),
    )
    db_session.add(item)
    db_session.flush()
    return order


class TestGetSalesReport:
    def test_rejects_to_date_before_from_date(self, db_session, service):
        with pytest.raises(DomainError) as exc_info:
            service.get_sales_report(db_session, from_date=date(2026, 1, 10), to_date=date(2026, 1, 1))
        assert exc_info.value.status_code == 400

    def test_aggregates_orders_and_quantities_by_day(self, db_session, service):
        today = datetime(2026, 3, 1, 10, 0, 0)
        _make_completed_order(db_session, "ORD-REPORT-1", today, Decimal("100000"), so_luong_item=3)
        _make_completed_order(db_session, "ORD-REPORT-2", today, Decimal("50000"), so_luong_item=2)

        results = service.get_sales_report(db_session, from_date=date(2026, 3, 1), to_date=date(2026, 3, 1))
        assert len(results) == 1
        day = results[0]
        assert day["ngay"] == date(2026, 3, 1)
        assert day["so_don_hang"] == 2
        assert day["tong_doanh_thu"] == Decimal("150000")
        assert day["so_luong_ban"] == 5

    def test_excludes_orders_outside_date_range(self, db_session, service):
        _make_completed_order(db_session, "ORD-REPORT-OLD", datetime(2020, 1, 1), Decimal("10000"))

        results = service.get_sales_report(db_session, from_date=date(2026, 1, 1), to_date=date(2026, 12, 31))
        assert all(r["ngay"] != date(2020, 1, 1) for r in results)

    def test_excludes_non_completed_orders(self, db_session, service):
        order = DonHang(
            ma_don_hang="ORD-REPORT-PENDING",
            tong_tien=Decimal("10000"),
            tien_thanh_toan=Decimal("10000"),
            trang_thai="cho",
            ngay_tao=datetime(2026, 4, 1),
        )
        db_session.add(order)
        db_session.flush()

        results = service.get_sales_report(db_session, from_date=date(2026, 4, 1), to_date=date(2026, 4, 1))
        assert results == []
