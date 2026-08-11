"""
Inventory trace / ledger domain service.

Extracted from app/routers/inventory_trace.py (Phase 1 service-layer
migration — same pattern as the other domains).

The ledger read-path (`get_inventory_ledger`) queried three near-identical
tables (LichSuKho{SanPham,LinhKien,HopQua}) with the same filter/shape
logic repeated per kind. That's collapsed here into one implementation
parameterized by a small `_LedgerKind` config, same approach used for
BatchService/AlertService. The per-batch-type metadata lookup
(`_batch_metadata`) is kept literal per kind — like BatchService's
reporting endpoints, the joins and output shape differ enough per kind
that forcing them through one generic method wouldn't pay for itself.

`get_batch_trace` calls `get_inventory_ledger` directly as a plain method
call (not an HTTP round-trip) — this mirrors the original router, which
called the sibling endpoint function directly for the same reason.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from sqlalchemy import func, literal, select, union_all
from sqlalchemy.orm import Session

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
    PhanBoChiTietDonHang,
    SanPham,
    TonKhoHopQua,
    TonKhoLinhKien,
    TonKhoSanPham,
)
from app.services.errors import DomainError

VALID_BATCH_TYPES = {"sanpham", "linhkien", "hopqua"}


@dataclass(frozen=True)
class _LedgerKind:
    ledger_model: type
    batch_fk_field: str


_LEDGER_KINDS: dict[str, _LedgerKind] = {
    "sanpham": _LedgerKind(LichSuKhoSanPham, "lohang_sanpham_id"),
    "linhkien": _LedgerKind(LichSuKhoLinhKien, "lohang_linhkien_id"),
    "hopqua": _LedgerKind(LichSuKhoHopQua, "lohang_hopqua_id"),
}


class InventoryTraceService:
    # ------------------------------------------------------------------
    # Ledger
    # ------------------------------------------------------------------
    @staticmethod
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

    @staticmethod
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

    def get_inventory_ledger(
        self,
        db: Session,
        item_type: Optional[str] = None,
        batch_id: Optional[int] = None,
        movement_type: Optional[str] = None,
        order_id: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 50,
        sort_by: str = "timestamp",
        sort_dir: str = "desc",
    ) -> dict:
        """Return one SQL-paginated view over the three inventory ledgers."""
        selects = []
        kinds = _LEDGER_KINDS.items() if item_type is None else [(item_type, _LEDGER_KINDS[item_type])]
        for kind_name, kind in kinds:
            model = kind.ledger_model
            batch_column = getattr(model, kind.batch_fk_field)
            filters = []
            if batch_id is not None:
                filters.append(batch_column == batch_id)
            if movement_type:
                filters.append(model.loai_giao_dich == movement_type)
            if order_id is not None:
                filters.append(model.donhang_id == order_id)
            if date_from:
                filters.append(model.ngay_tao >= date_from)
            if date_to:
                filters.append(model.ngay_tao <= date_to)
            selects.append(
                select(
                    model.lichsu_id.label("ledger_id"),
                    literal(kind_name).label("item_type"),
                    batch_column.label("batch_id"),
                    model.loai_giao_dich.label("movement_type"),
                    model.so_luong.label("quantity"),
                    model.so_luong_truoc.label("quantity_before"),
                    model.so_luong_sau.label("quantity_after"),
                    model.ly_do.label("reason"),
                    model.donhang_id.label("order_id"),
                    model.nguoidung_id.label("actor_user_id"),
                    model.ngay_tao.label("timestamp"),
                ).where(*filters)
            )

        ledger_query = union_all(*selects).subquery("inventory_ledger")
        total = db.execute(select(func.count()).select_from(ledger_query)).scalar_one()
        sort_column = ledger_query.c.movement_type if sort_by == "movement_type" else ledger_query.c.timestamp
        direction = sort_column.asc() if sort_dir == "asc" else sort_column.desc()
        rows = db.execute(
            select(ledger_query)
            .order_by(direction, ledger_query.c.ledger_id.asc())
            .offset(skip)
            .limit(limit)
        ).mappings().all()

        return {
            "items": [dict(row) for row in rows],
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    # ------------------------------------------------------------------
    # Batch trace (metadata + ledger + allocations)
    # ------------------------------------------------------------------
    @staticmethod
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
                raise DomainError(status_code=404, detail="Batch not found")
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
                raise DomainError(status_code=404, detail="Batch not found")
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
                raise DomainError(status_code=404, detail="Batch not found")
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

        raise DomainError(status_code=400, detail="Invalid batch type")

    def get_batch_trace(self, db: Session, batch_type: str, batch_id: int) -> dict:
        if batch_type not in VALID_BATCH_TYPES:
            raise DomainError(status_code=400, detail="Invalid batch type")

        metadata = self._batch_metadata(db, batch_type, batch_id)
        movements_page = self.get_inventory_ledger(db, item_type=batch_type, batch_id=batch_id)

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
            "movements": movements_page["items"],
            "allocations": allocations,
        }
