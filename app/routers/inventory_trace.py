from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.db import get_db
from app.models import (
    BienTheSanPham,
    ChiTietDonHang,
    HopQua,
    LichSuKhoHopQua,
    LichSuKhoLinhKien,
    LichSuKhoSanPham,
    LinhKien,
    LoHangHopQua,
    LoHangLinhKien,
    LoHangSanPham,
    NguoiDung,
    PhanBoChiTietDonHang,
    SanPham,
    TonKhoHopQua,
    TonKhoLinhKien,
    TonKhoSanPham,
)

router = APIRouter(tags=["inventory-trace"])


def _ledger_row(row, item_type: str, batch_id: int) -> dict:
    return {
        "ledger_id": row.lichsu_id,
        "item_type": item_type,
        "batch_id": batch_id,
        "movement_type": row.loai_giao_dich,
        "quantity": row.so_luong,
        "quantity_before": row.so_luong_truoc,
        "quantity_after": row.so_luong_sau,
        "reason": row.ly_do,
        "order_id": row.donhang_id,
        "actor_user_id": row.nguoidung_id,
        "timestamp": row.ngay_tao,
    }


def _apply_ledger_filters(query, model, batch_column, batch_id, movement_type, order_id, date_from, date_to):
    if batch_id is not None:
        query = query.filter(batch_column == batch_id)
    if movement_type:
        query = query.filter(model.loai_giao_dich == movement_type)
    if order_id is not None:
        query = query.filter(model.donhang_id == order_id)
    if date_from:
        query = query.filter(model.ngay_tao >= date_from)
    if date_to:
        query = query.filter(model.ngay_tao <= date_to)
    return query


@router.get("/inventory-ledger")
def get_inventory_ledger(
    item_type: Optional[str] = Query(None, pattern="^(sanpham|linhkien|hopqua)$"),
    batch_id: Optional[int] = Query(None, ge=1),
    movement_type: Optional[str] = Query(None, pattern="^(nhap_hang|xuat_ban|xuat_huy|dieu_chinh|kiem_ke|tra_hang|xuat_bom)$"),
    order_id: Optional[int] = Query(None, ge=1),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff")),
):
    rows: list[dict] = []

    if item_type in (None, "sanpham"):
        query = _apply_ledger_filters(
            db.query(LichSuKhoSanPham),
            LichSuKhoSanPham,
            LichSuKhoSanPham.lohang_sanpham_id,
            batch_id,
            movement_type,
            order_id,
            date_from,
            date_to,
        )
        rows.extend(_ledger_row(row, "sanpham", row.lohang_sanpham_id) for row in query.all())

    if item_type in (None, "linhkien"):
        query = _apply_ledger_filters(
            db.query(LichSuKhoLinhKien),
            LichSuKhoLinhKien,
            LichSuKhoLinhKien.lohang_linhkien_id,
            batch_id,
            movement_type,
            order_id,
            date_from,
            date_to,
        )
        rows.extend(_ledger_row(row, "linhkien", row.lohang_linhkien_id) for row in query.all())

    if item_type in (None, "hopqua"):
        query = _apply_ledger_filters(
            db.query(LichSuKhoHopQua),
            LichSuKhoHopQua,
            LichSuKhoHopQua.lohang_hopqua_id,
            batch_id,
            movement_type,
            order_id,
            date_from,
            date_to,
        )
        rows.extend(_ledger_row(row, "hopqua", row.lohang_hopqua_id) for row in query.all())

    rows.sort(key=lambda row: row["timestamp"] or datetime.min, reverse=True)
    return rows[skip : skip + limit]


def _batch_metadata(db: Session, batch_type: str, batch_id: int) -> dict:
    if batch_type == "sanpham":
        row = (
            db.query(LoHangSanPham, TonKhoSanPham, BienTheSanPham, SanPham)
            .join(TonKhoSanPham, TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id)
            .join(BienTheSanPham, BienTheSanPham.bienthe_id == LoHangSanPham.bienthe_sanpham_id)
            .join(SanPham, SanPham.sanpham_id == BienTheSanPham.sanpham_id)
            .filter(LoHangSanPham.lohang_id == batch_id)
            .first()
        )
        if not row:
            raise HTTPException(status_code=404, detail="Batch not found")
        batch, stock, variant, product = row
        return {
            "batch_type": "sanpham",
            "batch_id": batch.lohang_id,
            "batch_code": batch.ma_lo,
            "item_id": product.sanpham_id,
            "item_name": product.ten,
            "variant_id": variant.bienthe_id,
            "variant_name": f"{variant.huong_vi} {variant.kich_thuoc or ''}".strip(),
            "imported_quantity": batch.so_luong,
            "current_quantity": stock.so_luong_hien_tai,
            "sold_or_used_quantity": stock.so_luong_da_ban,
            "expires_at": batch.ngay_het_han,
            "status": batch.trang_thai,
        }

    if batch_type == "linhkien":
        row = (
            db.query(LoHangLinhKien, TonKhoLinhKien, LinhKien)
            .join(TonKhoLinhKien, TonKhoLinhKien.lohang_linhkien_id == LoHangLinhKien.lohang_id)
            .join(LinhKien, LinhKien.linh_kien_id == LoHangLinhKien.linh_kien_id)
            .filter(LoHangLinhKien.lohang_id == batch_id)
            .first()
        )
        if not row:
            raise HTTPException(status_code=404, detail="Batch not found")
        batch, stock, component = row
        return {
            "batch_type": "linhkien",
            "batch_id": batch.lohang_id,
            "batch_code": batch.ma_lo,
            "item_id": component.linh_kien_id,
            "item_name": component.ten_linh_kien,
            "variant_id": None,
            "variant_name": None,
            "imported_quantity": batch.so_luong,
            "current_quantity": stock.so_luong_hien_tai,
            "sold_or_used_quantity": stock.so_luong_da_su_dung,
            "expires_at": batch.ngay_het_han,
            "status": batch.trang_thai,
        }

    if batch_type == "hopqua":
        row = (
            db.query(LoHangHopQua, TonKhoHopQua, HopQua)
            .join(TonKhoHopQua, TonKhoHopQua.lohang_hopqua_id == LoHangHopQua.lohang_id)
            .join(HopQua, HopQua.hop_qua_id == LoHangHopQua.hop_qua_id)
            .filter(LoHangHopQua.lohang_id == batch_id)
            .first()
        )
        if not row:
            raise HTTPException(status_code=404, detail="Batch not found")
        batch, stock, gift_box = row
        return {
            "batch_type": "hopqua",
            "batch_id": batch.lohang_id,
            "batch_code": batch.ma_lo,
            "item_id": gift_box.hop_qua_id,
            "item_name": gift_box.ten_hop_qua,
            "variant_id": None,
            "variant_name": None,
            "imported_quantity": batch.so_luong,
            "current_quantity": stock.so_luong_hien_tai,
            "sold_or_used_quantity": stock.so_luong_da_ban,
            "expires_at": batch.ngay_het_han,
            "status": batch.trang_thai,
        }

    raise HTTPException(status_code=400, detail="Invalid batch type")


@router.get("/batch-trace/{batch_type}/{batch_id}")
def get_batch_trace(
    batch_type: str,
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff")),
):
    if batch_type not in {"sanpham", "linhkien", "hopqua"}:
        raise HTTPException(status_code=400, detail="Invalid batch type")

    metadata = _batch_metadata(db, batch_type, batch_id)
    movements = get_inventory_ledger(
        item_type=batch_type,
        batch_id=batch_id,
        db=db,
        current_user=current_user,
    )

    allocation_query = (
        db.query(PhanBoChiTietDonHang, ChiTietDonHang)
        .join(ChiTietDonHang, ChiTietDonHang.chitiet_id == PhanBoChiTietDonHang.chitiet_id)
        .filter(PhanBoChiTietDonHang.loai_lohang == batch_type)
    )
    if batch_type == "sanpham":
        allocation_query = allocation_query.filter(PhanBoChiTietDonHang.lohang_sanpham_id == batch_id)
    elif batch_type == "linhkien":
        allocation_query = allocation_query.filter(PhanBoChiTietDonHang.lohang_linhkien_id == batch_id)
    else:
        allocation_query = allocation_query.filter(PhanBoChiTietDonHang.lohang_hopqua_id == batch_id)

    allocations = [
        {
            "allocation_id": allocation.phanbo_id,
            "order_id": detail.donhang_id,
            "order_item_id": allocation.chitiet_id,
            "quantity": allocation.so_luong,
            "created_at": allocation.ngay_tao,
        }
        for allocation, detail in allocation_query.order_by(PhanBoChiTietDonHang.ngay_tao.desc()).all()
    ]

    return {
        "batch": metadata,
        "movements": movements,
        "allocations": allocations,
    }
