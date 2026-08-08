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

from app.models import ChiTietDonHang, DonHang
from app.services.errors import DomainError


class ReportService:
    @staticmethod
    def get_sales_report(db: Session, from_date: date, to_date: date) -> list[dict]:
        if to_date < from_date:
            raise DomainError(status_code=400, detail="Ngày kết thúc phải sau ngày bắt đầu")

        orders = db.query(DonHang).filter(
            and_(
                func.date(DonHang.ngay_tao) >= from_date,
                func.date(DonHang.ngay_tao) <= to_date,
                DonHang.trang_thai == "hoan_thanh",
            )
        ).all()

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
