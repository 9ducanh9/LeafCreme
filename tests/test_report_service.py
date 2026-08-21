"""
Tests for app.services.reports.ReportService — Phase 1 service-layer
migration (see app/services/reports/report_service.py).
"""
from datetime import date, datetime
from decimal import Decimal

import pytest

from app.models import BienTheSanPham, ChiTietDonHang, DonHang, LoHangSanPham, SanPham
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


def _make_product_order(db_session, suffix: str, ngay_tao: datetime, amount: Decimal, category: str = "P2 report"):
    product = SanPham(
        ten=f"Report product {suffix}",
        sku=f"REPORT-{suffix}",
        loai="bien_the",
        gia_co_ban=amount,
        danh_muc=category,
    )
    db_session.add(product)
    db_session.flush()
    variant = BienTheSanPham(
        sanpham_id=product.sanpham_id,
        huong_vi="Report flavor",
        kich_thuoc="M",
        gia_bienthe=amount,
        sku_bienthe=f"REPORT-V-{suffix}",
    )
    db_session.add(variant)
    db_session.flush()
    lot = LoHangSanPham(
        bienthe_sanpham_id=variant.bienthe_id,
        ma_lo=f"REPORT-LOT-{suffix}",
        ngay_het_han=ngay_tao,
        so_luong=20,
        gia_don_vi=amount,
        trang_thai="hoatdong",
    )
    db_session.add(lot)
    db_session.flush()
    order = DonHang(
        ma_don_hang=f"ORD-REPORT-PRODUCT-{suffix}",
        tong_tien=amount,
        tien_thanh_toan=amount,
        trang_thai="hoan_thanh",
        ngay_tao=ngay_tao,
    )
    db_session.add(order)
    db_session.flush()
    db_session.add(
        ChiTietDonHang(
            donhang_id=order.donhang_id,
            lohang_sanpham_id=lot.lohang_id,
            so_luong=2,
            gia_don_vi=amount / 2,
            tong_tien_phu=amount,
        )
    )
    db_session.flush()
    return product, order


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


class TestRevenueAggregates:
    def test_product_and_category_aggregates_use_completed_sales_definition(self, db_session, service):
        product, _ = _make_product_order(
            db_session,
            "AGG-1",
            datetime(2026, 5, 10, 12, 0, 0),
            Decimal("120000"),
        )
        pending = DonHang(
            ma_don_hang="ORD-REPORT-AGG-PENDING",
            tong_tien=Decimal("999000"),
            tien_thanh_toan=Decimal("999000"),
            trang_thai="cho",
            ngay_tao=datetime(2026, 5, 10, 13, 0, 0),
        )
        db_session.add(pending)
        db_session.flush()

        sales = service.get_sales_report(db_session, date(2026, 5, 10), date(2026, 5, 10))
        by_product = service.get_revenue_by_product(db_session, date(2026, 5, 10), date(2026, 5, 10))
        by_category = service.get_revenue_by_category(db_session, date(2026, 5, 10), date(2026, 5, 10))

        assert sales[0]["tong_doanh_thu"] == Decimal("120000")
        assert by_product == [{"sanpham_id": product.sanpham_id, "ten": product.ten, "doanh_thu": Decimal("120000"), "so_luong": 2}]
        assert by_category == [{"danh_muc": "P2 report", "doanh_thu": Decimal("120000"), "so_luong": 2}]
