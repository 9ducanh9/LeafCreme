"""
Analytics domain service.

Extracted from app/routers/analytics.py (Phase 1 service-layer migration).
Moved verbatim — including the try/except fallback around the best-seller
subquery and the "no sales data yet" fallback to newest-active-products.
Both looked like defensive leftovers rather than deliberate behavior, but
this migration preserves behavior rather than silently removing them; see
LeafCreme_Restructure_Plan.md for the "no drive-by fixes" rule.
"""
import logging

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import BienTheSanPham, ChiTietDonHang, DonHang, LoHangSanPham, SanPham


class AnalyticsService:
    @staticmethod
    def get_best_sellers(db: Session, limit: int) -> list[dict]:
        try:
            subquery = (
                db.query(
                    BienTheSanPham.sanpham_id,
                    func.sum(ChiTietDonHang.so_luong).label("sold_count"),
                )
                .select_from(ChiTietDonHang)
                .join(DonHang, DonHang.donhang_id == ChiTietDonHang.donhang_id)
                .join(LoHangSanPham, LoHangSanPham.lohang_id == ChiTietDonHang.lohang_sanpham_id)
                .join(BienTheSanPham, BienTheSanPham.bienthe_id == LoHangSanPham.bienthe_sanpham_id)
                .filter(
                    DonHang.trang_thai == "hoan_thanh",
                    ChiTietDonHang.lohang_sanpham_id.isnot(None),
                )
                .group_by(BienTheSanPham.sanpham_id)
                .subquery()
            )
        except Exception as e:
            logging.error(f"Error in best-sellers query: {e}")
            products = (
                db.query(SanPham)
                .filter(SanPham.dang_hoat_dong == True)  # noqa: E712 (matches original ORM filter style)
                .order_by(SanPham.ngay_tao.desc())
                .limit(limit)
                .all()
            )
            return [_fallback_row(p) for p in products]

        results = (
            db.query(
                SanPham.sanpham_id,
                SanPham.ten,
                SanPham.danh_muc,
                SanPham.gia_co_ban,
                SanPham.hinh_anh_url,
                func.coalesce(subquery.c.sold_count, 0).label("sold_count"),
            )
            .outerjoin(subquery, SanPham.sanpham_id == subquery.c.sanpham_id)
            .filter(SanPham.dang_hoat_dong == True)  # noqa: E712
            .order_by(func.coalesce(subquery.c.sold_count, 0).desc(), SanPham.ten)
            .limit(limit)
            .all()
        )

        best_sellers = [
            {
                "product_id": row.sanpham_id,
                "name": row.ten,
                "category": row.danh_muc,
                "base_price": row.gia_co_ban,
                "image_url": row.hinh_anh_url,
                "sold_count": int(row.sold_count) if row.sold_count else 0,
            }
            for row in results
        ]

        if not best_sellers or all(bs["sold_count"] == 0 for bs in best_sellers):
            products = (
                db.query(SanPham)
                .filter(SanPham.dang_hoat_dong == True)  # noqa: E712
                .order_by(SanPham.ngay_tao.desc())
                .limit(limit)
                .all()
            )
            best_sellers = [_fallback_row(p) for p in products]

        return best_sellers


def _fallback_row(p: SanPham) -> dict:
    return {
        "product_id": p.sanpham_id,
        "name": p.ten,
        "category": p.danh_muc,
        "base_price": p.gia_co_ban,
        "image_url": p.hinh_anh_url,
        "sold_count": 0,
    }
