from dataclasses import dataclass
from datetime import date
from typing import Optional

from sqlalchemy import Date, cast, select
from sqlalchemy.orm import Session

from app.models import (
    LoHangHopQua,
    LoHangLinhKien,
    LoHangSanPham,
    TonKhoHopQua,
    TonKhoLinhKien,
    TonKhoSanPham,
)
from app.services.inventory_ledger_service import InventoryLedgerService

from .errors import DomainError


@dataclass(frozen=True)
class InventoryAllocation:
    batch_type: str
    batch_id: int
    quantity: int
    before: int
    after: int


class InventoryService:
    def __init__(self):
        self.ledger = InventoryLedgerService()

    def allocate_variant(
        self,
        db: Session,
        bienthe_id: int,
        so_luong: int,
        error_message: str,
        *,
        donhang_id: Optional[int] = None,
        nguoidung_id: Optional[int] = None,
        reason: str = "Order product deduction",
    ) -> list[InventoryAllocation]:
        today = date.today()
        rows = db.execute(
            select(LoHangSanPham, TonKhoSanPham)
            .join(TonKhoSanPham, TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id)
            .where(
                LoHangSanPham.bienthe_sanpham_id == bienthe_id,
                LoHangSanPham.trang_thai == "hoatdong",
                cast(LoHangSanPham.ngay_het_han, Date) >= today,
                TonKhoSanPham.so_luong_hien_tai > 0,
            )
            .order_by(LoHangSanPham.ngay_het_han.asc())
            .with_for_update()
        ).all()

        allocations: list[InventoryAllocation] = []
        remain = so_luong
        for lot, stock in rows:
            if remain <= 0:
                break

            before = stock.so_luong_hien_tai or 0
            take = min(before, remain)
            if take <= 0:
                continue

            after = before - take
            stock.so_luong_hien_tai = after
            stock.so_luong_da_ban = (stock.so_luong_da_ban or 0) + take
            self.ledger.log_product_movement(
                db,
                lohang_sanpham_id=lot.lohang_id,
                loai_giao_dich="xuat_ban",
                so_luong=take,
                so_luong_truoc=before,
                so_luong_sau=after,
                ly_do=reason,
                donhang_id=donhang_id,
                nguoidung_id=nguoidung_id,
            )
            allocations.append(InventoryAllocation("sanpham", lot.lohang_id, take, before, after))
            remain -= take

        if remain != 0:
            raise DomainError(status_code=400, detail=error_message)

        return allocations

    def allocate_gift_box(
        self,
        db: Session,
        hop_qua_id: int,
        so_luong: int,
        error_message: str,
        *,
        donhang_id: Optional[int] = None,
        nguoidung_id: Optional[int] = None,
        reason: str = "Order gift box deduction",
    ) -> list[InventoryAllocation]:
        today = date.today()
        rows = db.execute(
            select(LoHangHopQua, TonKhoHopQua)
            .join(TonKhoHopQua, TonKhoHopQua.lohang_hopqua_id == LoHangHopQua.lohang_id)
            .where(
                LoHangHopQua.hop_qua_id == hop_qua_id,
                LoHangHopQua.trang_thai == "hoatdong",
                cast(LoHangHopQua.ngay_het_han, Date) >= today,
                TonKhoHopQua.so_luong_hien_tai > 0,
            )
            .order_by(LoHangHopQua.ngay_het_han.asc())
            .with_for_update()
        ).all()

        allocations: list[InventoryAllocation] = []
        remain = so_luong
        for lot, stock in rows:
            if remain <= 0:
                break

            before = stock.so_luong_hien_tai or 0
            take = min(before, remain)
            if take <= 0:
                continue

            after = before - take
            stock.so_luong_hien_tai = after
            stock.so_luong_da_ban = (stock.so_luong_da_ban or 0) + take
            self.ledger.log_gift_box_movement(
                db,
                lohang_hopqua_id=lot.lohang_id,
                loai_giao_dich="xuat_ban",
                so_luong=take,
                so_luong_truoc=before,
                so_luong_sau=after,
                ly_do=reason,
                donhang_id=donhang_id,
                nguoidung_id=nguoidung_id,
            )
            allocations.append(InventoryAllocation("hopqua", lot.lohang_id, take, before, after))
            remain -= take

        if remain != 0:
            raise DomainError(status_code=400, detail=error_message)

        return allocations

    def allocate_component_lot(
        self,
        db: Session,
        lohang_linhkien_id: int,
        so_luong: int,
        error_message: str,
        *,
        bom_id: Optional[int] = None,
        donhang_id: Optional[int] = None,
        nguoidung_id: Optional[int] = None,
        reason: str = "Order component deduction",
    ) -> InventoryAllocation:
        row = db.execute(
            select(LoHangLinhKien, TonKhoLinhKien)
            .join(TonKhoLinhKien, TonKhoLinhKien.lohang_linhkien_id == LoHangLinhKien.lohang_id)
            .where(
                LoHangLinhKien.lohang_id == lohang_linhkien_id,
                LoHangLinhKien.trang_thai == "hoatdong",
            )
            .with_for_update()
        ).first()

        if not row:
            raise DomainError(status_code=400, detail=error_message)

        lot, stock = row
        before = stock.so_luong_hien_tai or 0
        if before < so_luong:
            raise DomainError(status_code=400, detail=error_message)

        after = before - so_luong
        stock.so_luong_hien_tai = after
        stock.so_luong_da_su_dung = (stock.so_luong_da_su_dung or 0) + so_luong
        self.ledger.log_component_movement(
            db,
            lohang_linhkien_id=lot.lohang_id,
            loai_giao_dich="xuat_bom",
            so_luong=so_luong,
            so_luong_truoc=before,
            so_luong_sau=after,
            ly_do=reason,
            bom_id=bom_id,
            donhang_id=donhang_id,
            nguoidung_id=nguoidung_id,
        )
        return InventoryAllocation("linhkien", lot.lohang_id, so_luong, before, after)
