"""Sellable variant stock shared by the storefront and Leafie."""

from datetime import date

from sqlalchemy import Date, cast, func, select
from sqlalchemy.orm import Session

from app.models import LoHangSanPham, TonKhoSanPham


def sellable_stock(db: Session, variant_ids: list[int]) -> dict:
    if not variant_ids:
        return {}
    rows = db.execute(
        select(
            LoHangSanPham.bienthe_sanpham_id,
            func.coalesce(func.sum(TonKhoSanPham.so_luong_hien_tai), 0),
            func.min(LoHangSanPham.ngay_het_han),
        )
        .join(TonKhoSanPham, TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id)
        .where(
            LoHangSanPham.bienthe_sanpham_id.in_(variant_ids),
            LoHangSanPham.trang_thai == "hoatdong",
            cast(LoHangSanPham.ngay_het_han, Date) >= date.today(),
            TonKhoSanPham.so_luong_hien_tai > 0,
        )
        .group_by(LoHangSanPham.bienthe_sanpham_id)
    ).all()
    return {variant_id: (int(quantity or 0), expiry) for variant_id, quantity, expiry in rows}
