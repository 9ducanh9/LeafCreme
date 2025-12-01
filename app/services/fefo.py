# app/services/fefo.py
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import NoResultFound
from decimal import Decimal
from ..models import LoHangSanPham, TonKhoSanPham

def alloc_fefo_by_variant(db: Session, bienthe_id: int, need_qty: int):
    """
    Trả về: [(lohang_id, take_qty), ...]
    Rule: lọc các lô còn hàng, order by ngay_het_han ASC, FOR UPDATE
    """
    alloc = []
    remain = need_qty

    q = (
        select(LoHangSanPham, TonKhoSanPham)
        .join(TonKhoSanPham, TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id)
        .where(
            LoHangSanPham.bienthe_sanpham_id == bienthe_id,
            TonKhoSanPham.so_luong_hien_tai > 0
        )
        .order_by(LoHangSanPham.ngay_het_han.asc())
        .with_for_update()
    )
    rows = db.execute(q).all()

    for lo, ton in rows:
        if remain <= 0:
            break
        take = min(ton.so_luong_hien_tai, remain)
        if take > 0:
            ton.so_luong_hien_tai -= take
            ton.so_luong_da_ban = (ton.so_luong_da_ban or 0) + take
            alloc.append((lo.lohang_id, take))
            remain -= take

    return alloc, (remain == 0)
