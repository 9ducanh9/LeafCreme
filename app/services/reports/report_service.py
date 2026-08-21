"""
Reports domain service.

Extracted from app/routers/reports.py (Phase 1 service-layer migration).
Moved verbatim — including the per-order N+1 query for order items. It's
inefficient (one extra query per order in range instead of one grouped
query), but this migration preserves behavior rather than silently
optimizing; flagged here rather than fixed unasked.
"""
from datetime import date
from decimal import Decimal

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.models import BienTheSanPham, ChiTietDonHang, DonHang, LoHangSanPham, SanPham
from app.services.errors import DomainError


class ReportService:
    @staticmethod
    def _completed_orders(db: Session, from_date: date, to_date: date) -> list[DonHang]:
        if to_date < from_date:
            raise DomainError(status_code=400, detail="Ngày kết thúc phải sau ngày bắt đầu")
        return db.query(DonHang).filter(
            and_(
                func.date(DonHang.ngay_tao) >= from_date,
                func.date(DonHang.ngay_tao) <= to_date,
                DonHang.trang_thai == "hoan_thanh",
            )
        ).all()

    @staticmethod
    def get_sales_report(db: Session, from_date: date, to_date: date) -> list[dict]:
        orders = ReportService._completed_orders(db, from_date, to_date)

        daily_stats: dict[date, dict] = {}
        for order in orders:
            order_date = order.ngay_tao.date()
            if order_date not in daily_stats:
                daily_stats[order_date] = {
                    "so_don_hang": 0,
                    "tong_doanh_thu": Decimal("0"),
                    "so_luong_ban": 0,
                }

            daily_stats[order_date]["so_don_hang"] += 1
            daily_stats[order_date]["tong_doanh_thu"] += order.tong_tien

            items = db.query(ChiTietDonHang).filter(
                ChiTietDonHang.donhang_id == order.donhang_id
            ).all()
            for item in items:
                daily_stats[order_date]["so_luong_ban"] += item.so_luong

        return [
            {"ngay": order_date, **daily_stats[order_date]}
            for order_date in sorted(daily_stats.keys())
        ]

    @staticmethod
    def get_revenue_by_product(db: Session, from_date: date, to_date: date, limit: int = 20) -> list[dict]:
        orders = ReportService._completed_orders(db, from_date, to_date)
        if not orders:
            return []
        order_ids = [order.donhang_id for order in orders]
        rows = db.query(
            SanPham.sanpham_id,
            SanPham.ten,
            func.coalesce(func.sum(ChiTietDonHang.tong_tien_phu), 0).label("doanh_thu"),
            func.coalesce(func.sum(ChiTietDonHang.so_luong), 0).label("so_luong"),
        ).join(
            LoHangSanPham, LoHangSanPham.lohang_id == ChiTietDonHang.lohang_sanpham_id,
        ).join(
            BienTheSanPham, BienTheSanPham.bienthe_id == LoHangSanPham.bienthe_sanpham_id,
        ).join(
            SanPham, SanPham.sanpham_id == BienTheSanPham.sanpham_id,
        ).filter(
            ChiTietDonHang.donhang_id.in_(order_ids),
            ChiTietDonHang.lohang_sanpham_id.is_not(None),
        ).group_by(SanPham.sanpham_id, SanPham.ten).order_by(
            func.sum(ChiTietDonHang.tong_tien_phu).desc(), SanPham.ten.asc(),
        ).limit(limit).all()
        return [
            {"sanpham_id": row.sanpham_id, "ten": row.ten, "doanh_thu": row.doanh_thu, "so_luong": int(row.so_luong or 0)}
            for row in rows
        ]

    @staticmethod
    def get_revenue_by_category(db: Session, from_date: date, to_date: date) -> list[dict]:
        orders = ReportService._completed_orders(db, from_date, to_date)
        if not orders:
            return []
        order_ids = [order.donhang_id for order in orders]
        rows = db.query(
            SanPham.danh_muc,
            func.coalesce(func.sum(ChiTietDonHang.tong_tien_phu), 0).label("doanh_thu"),
            func.coalesce(func.sum(ChiTietDonHang.so_luong), 0).label("so_luong"),
        ).join(
            LoHangSanPham, LoHangSanPham.lohang_id == ChiTietDonHang.lohang_sanpham_id,
        ).join(
            BienTheSanPham, BienTheSanPham.bienthe_id == LoHangSanPham.bienthe_sanpham_id,
        ).join(
            SanPham, SanPham.sanpham_id == BienTheSanPham.sanpham_id,
        ).filter(
            ChiTietDonHang.donhang_id.in_(order_ids),
            ChiTietDonHang.lohang_sanpham_id.is_not(None),
        ).group_by(SanPham.danh_muc).order_by(func.sum(ChiTietDonHang.tong_tien_phu).desc()).all()
        return [
            {"danh_muc": row.danh_muc or "Chưa phân loại", "doanh_thu": row.doanh_thu, "so_luong": int(row.so_luong or 0)}
            for row in rows
        ]
