"""
Batch domain service.

Extracted from app/routers/batches.py (Phase 1 service-layer migration —
see LeafCreme_Restructure_Plan.md section 2.2 and the analogous
app/services/payments/payment_service.py extraction).

Unlike payments.py, the original router here wasn't just "router calling
ORM directly" — it was the same create/list/get/update CRUD sequence
written out three times almost verbatim, once each for product/component/
gift-box batches (~500 of the file's 960 lines). That's a mechanical,
exact duplication, so this migration goes one step further than a literal
line-for-line move: the four CRUD operations are generalized into one
implementation parameterized by a small per-"kind" config (_BATCH_KINDS
below), instead of being copy-pasted into a class three times too.

Two behavioral inconsistencies existed between the three kinds in the
original code. One is fixed here, one is preserved:

  - FIXED: only product batches validated ma_qr uniqueness at the app
    level (create + update). Component/gift-box batches didn't — but
    LoHang{SanPham,LinhKien,HopQua}.ma_qr all have a DB-level UNIQUE
    constraint regardless, so a duplicate ma_qr on those two kinds didn't
    silently succeed: it raised an unhandled IntegrityError that fell
    through to main.py's generic Exception handler as a bare 500 instead
    of a clean 400. All three kinds now run the same app-level check
    (see `create_batch`/`update_batch` below) so every kind gets the same
    clear 400 "Mã QR đã tồn tại" instead of two of them 500ing.
  - PRESERVED (not changed): only product batch search matches against
    ma_qr as well as ma_lo — component/gift-box search matches ma_lo only.
    See `search_includes_qr` below. This one has no failure-mode argument
    for fixing it the way the QR-uniqueness bug did, so it was left as a
    product decision rather than changed unasked.

The reporting endpoints (expiring batches, per-kind inventory listing,
by-variant lookup) were NOT collapsed into the same generic abstraction —
their joins and output shapes differ enough per kind that forcing them
through one parameterized method would trade readability for a small
amount of line-count savings. They're moved here close to their original
shape instead.
"""
from dataclasses import dataclass
from datetime import date, datetime, timedelta
import logging
from typing import Any, Callable, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models import (
    BienTheSanPham,
    HopQua,
    LinhKien,
    LoHangHopQua,
    LoHangLinhKien,
    LoHangSanPham,
    NguoiDung,
    NhaCungCap,
    SanPham,
    TonKhoHopQua,
    TonKhoLinhKien,
    TonKhoSanPham,
)
from app.services.errors import DomainError
from app.services.inventory_ledger_service import InventoryLedgerService

logger = logging.getLogger("bakeryonl.batches")


def _refresh_proactive_expiry_insights(db: Session) -> None:
    """Run the existing deterministic detector immediately after a batch write.

    A batch imported today can already be inside the high-severity expiry
    window.  Waiting for the daily sweep would hide that fact.  The detector
    itself remains AlertService.generate_alerts; this hook adds no new expiry
    business rule and is best-effort so it cannot roll back a valid import.
    """
    try:
        from app.services.agent.proactive_service import safe_refresh_expiring_batch_insights
        from app.services.alerts.alert_service import (
            DEFAULT_EXPIRING_DAYS,
            DEFAULT_LOW_STOCK_THRESHOLD,
            AlertService,
        )

        AlertService().generate_alerts(
            db,
            low_stock_threshold=DEFAULT_LOW_STOCK_THRESHOLD,
            expiring_days=DEFAULT_EXPIRING_DAYS,
        )
        result = safe_refresh_expiring_batch_insights(db)
        if result.get("created") or result.get("error"):
            logger.info("Proactive expiry refresh after batch write: %s", result)
    except Exception:
        # Defensive outer guard: batch persistence has already committed.
        logger.exception("Unable to refresh proactive expiry insights after batch write")


@dataclass(frozen=True)
class _BatchKind:
    label: str                      # Vietnamese label used in "not found" messages
    batch_model: type
    inventory_model: type
    item_model: type
    item_fk_field: str               # FK column name on batch_model pointing at item_model
    item_pk_field: str                # PK column name on item_model
    item_not_found_label: str
    inventory_fk_field: str          # FK column name on inventory_model pointing at batch
    sold_field: str                  # "so_luong_da_ban" or "so_luong_da_su_dung"
    search_includes_qr: bool         # only True for products — see module docstring
    ledger_log: Callable             # bound InventoryLedgerService.log_*_movement
    ledger_fk_kwarg: str
    ledger_ly_do: str                # exact original per-kind ledger reason string


class BatchService:
    def __init__(self):
        self.ledger = InventoryLedgerService()
        self._kinds: dict[str, _BatchKind] = {
            "products": _BatchKind(
                label="Lô hàng",
                batch_model=LoHangSanPham,
                inventory_model=TonKhoSanPham,
                item_model=BienTheSanPham,
                item_fk_field="bienthe_sanpham_id",
                item_pk_field="bienthe_id",
                item_not_found_label="Biến thể sản phẩm",
                inventory_fk_field="lohang_sanpham_id",
                sold_field="so_luong_da_ban",
                search_includes_qr=True,
                ledger_log=self.ledger.log_product_movement,
                ledger_fk_kwarg="lohang_sanpham_id",
                ledger_ly_do="Nhập lô sản phẩm",
            ),
            "components": _BatchKind(
                label="Lô hàng",
                batch_model=LoHangLinhKien,
                inventory_model=TonKhoLinhKien,
                item_model=LinhKien,
                item_fk_field="linh_kien_id",
                item_pk_field="linh_kien_id",
                item_not_found_label="Linh kiện",
                inventory_fk_field="lohang_linhkien_id",
                sold_field="so_luong_da_su_dung",
                search_includes_qr=False,
                ledger_log=self.ledger.log_component_movement,
                ledger_fk_kwarg="lohang_linhkien_id",
                ledger_ly_do="Nhập lô linh kiện",
            ),
            "gift_boxes": _BatchKind(
                label="Lô hàng",
                batch_model=LoHangHopQua,
                inventory_model=TonKhoHopQua,
                item_model=HopQua,
                item_fk_field="hop_qua_id",
                item_pk_field="hop_qua_id",
                item_not_found_label="Hộp quà",
                inventory_fk_field="lohang_hopqua_id",
                sold_field="so_luong_da_ban",
                search_includes_qr=False,
                ledger_log=self.ledger.log_gift_box_movement,
                ledger_fk_kwarg="lohang_hopqua_id",
                ledger_ly_do="Nhập lô hộp quà",
            ),
        }

    # ------------------------------------------------------------------
    # Shared helpers
    # ------------------------------------------------------------------
    def _kind(self, kind: str) -> _BatchKind:
        return self._kinds[kind]

    @staticmethod
    def _get_or_404(db: Session, model: type, pk_field: str, value: Any, not_found_detail: str):
        obj = db.query(model).filter(getattr(model, pk_field) == value).first()
        if not obj:
            raise DomainError(status_code=404, detail=not_found_detail)
        return obj

    def _to_response(self, cfg: _BatchKind, batch, inventory) -> dict:
        result = {c.name: getattr(batch, c.name) for c in batch.__table__.columns}
        result["so_luong_hien_tai"] = inventory.so_luong_hien_tai if inventory else None
        result[cfg.sold_field] = getattr(inventory, cfg.sold_field) if inventory else None
        return result

    def _get_inventory(self, db: Session, cfg: _BatchKind, batch_id: int):
        return db.query(cfg.inventory_model).filter(
            getattr(cfg.inventory_model, cfg.inventory_fk_field) == batch_id
        ).first()

    # ------------------------------------------------------------------
    # Generic CRUD (was duplicated 3x in the original router)
    # ------------------------------------------------------------------
    def create_batch(self, db: Session, kind: str, payload: Any, current_user: NguoiDung) -> dict:
        cfg = self._kind(kind)

        item_id = getattr(payload, cfg.item_fk_field)
        item = self._get_or_404(
            db, cfg.item_model, cfg.item_pk_field, item_id,
            f"{cfg.item_not_found_label} với ID {item_id} không tồn tại",
        )

        if payload.ncc_id:
            self._get_or_404(
                db, NhaCungCap, "ncc_id", payload.ncc_id,
                f"Nhà cung cấp với ID {payload.ncc_id} không tồn tại",
            )

        existing = db.query(cfg.batch_model).filter(cfg.batch_model.ma_lo == payload.ma_lo).first()
        if existing:
            raise DomainError(status_code=400, detail=f"Mã lô '{payload.ma_lo}' đã tồn tại")

        if payload.ma_qr:
            existing_qr = db.query(cfg.batch_model).filter(cfg.batch_model.ma_qr == payload.ma_qr).first()
            if existing_qr:
                raise DomainError(status_code=400, detail=f"Mã QR '{payload.ma_qr}' đã tồn tại")

        payload_data = payload.model_dump()
        if kind == "products":
            produced_at = payload_data.get("ngay_san_xuat") or datetime.now()
            expires_at = payload_data.get("ngay_het_han")
            if expires_at is None:
                product = db.query(SanPham).filter(SanPham.sanpham_id == item.sanpham_id).first()
                shelf_life_days = product.han_su_dung_ngay if product else None
                if shelf_life_days is None:
                    raise DomainError(
                        status_code=400,
                        detail="Sản phẩm chưa cấu hình hạn sử dụng; vui lòng nhập ngày hết hạn thủ công",
                    )
                expires_at = produced_at + timedelta(days=shelf_life_days)
            if expires_at <= produced_at:
                raise DomainError(status_code=400, detail="Ngày hết hạn phải sau ngày sản xuất")
            payload_data["ngay_san_xuat"] = produced_at
            payload_data["ngay_het_han"] = expires_at

        expires_at = payload_data["ngay_het_han"]
        if expires_at.date() < date.today():
            raise DomainError(status_code=400, detail="Ngày hết hạn phải sau ngày nhập")

        batch = cfg.batch_model(**payload_data)
        db.add(batch)
        db.flush()

        inventory = cfg.inventory_model(**{
            cfg.inventory_fk_field: batch.lohang_id,
            "so_luong_hien_tai": batch.so_luong,
            cfg.sold_field: 0,
        })
        db.add(inventory)

        cfg.ledger_log(
            db,
            **{cfg.ledger_fk_kwarg: batch.lohang_id},
            loai_giao_dich="nhap_hang",
            so_luong=batch.so_luong,
            so_luong_truoc=0,
            so_luong_sau=batch.so_luong,
            ly_do=cfg.ledger_ly_do,
            nguoidung_id=current_user.nguoidung_id,
            gia_tri=batch.gia_don_vi * batch.so_luong,
        )

        db.commit()
        db.refresh(batch)
        _refresh_proactive_expiry_insights(db)
        return self._to_response(cfg, batch, inventory)

    def list_batches(
        self,
        db: Session,
        kind: str,
        skip: int = 0,
        limit: int = 100,
        item_id: Optional[int] = None,
        ncc_id: Optional[int] = None,
        trang_thai: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "ngay_het_han",
        sort_dir: str = "asc",
    ) -> dict:
        cfg = self._kind(kind)
        query = db.query(cfg.batch_model)

        if item_id:
            query = query.filter(getattr(cfg.batch_model, cfg.item_fk_field) == item_id)
        if ncc_id:
            query = query.filter(cfg.batch_model.ncc_id == ncc_id)
        if trang_thai:
            query = query.filter(cfg.batch_model.trang_thai == trang_thai)
        if search:
            if cfg.search_includes_qr:
                query = query.filter(or_(
                    cfg.batch_model.ma_lo.ilike(f"%{search}%"),
                    cfg.batch_model.ma_qr.ilike(f"%{search}%"),
                ))
            else:
                query = query.filter(cfg.batch_model.ma_lo.ilike(f"%{search}%"))

        total = query.count()
        production_column = (
            cfg.batch_model.ngay_san_xuat
            if kind == "products"
            else cfg.batch_model.ngay_nhap
        )
        sort_columns = {
            "ngay_het_han": cfg.batch_model.ngay_het_han,
            "ngay_san_xuat": production_column,
            "ngay_tao": cfg.batch_model.ngay_tao,
        }
        if sort_by == "so_luong_hien_tai":
            query = query.outerjoin(
                cfg.inventory_model,
                getattr(cfg.inventory_model, cfg.inventory_fk_field) == cfg.batch_model.lohang_id,
            )
            sort_column = cfg.inventory_model.so_luong_hien_tai
        else:
            sort_column = sort_columns.get(sort_by, cfg.batch_model.ngay_het_han)

        direction = sort_column.desc() if sort_dir == "desc" else sort_column.asc()
        batches = query.order_by(direction, cfg.batch_model.lohang_id.asc()).offset(skip).limit(limit).all()
        items = [
            self._to_response(cfg, batch, self._get_inventory(db, cfg, batch.lohang_id))
            for batch in batches
        ]
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    def get_batch(self, db: Session, kind: str, batch_id: int) -> dict:
        cfg = self._kind(kind)
        batch = self._get_or_404(
            db, cfg.batch_model, "lohang_id", batch_id,
            f"{cfg.label} với ID {batch_id} không tồn tại",
        )
        return self._to_response(cfg, batch, self._get_inventory(db, cfg, batch.lohang_id))

    def update_batch(self, db: Session, kind: str, batch_id: int, payload: Any) -> dict:
        cfg = self._kind(kind)
        batch = self._get_or_404(
            db, cfg.batch_model, "lohang_id", batch_id,
            f"{cfg.label} với ID {batch_id} không tồn tại",
        )

        update_data = payload.model_dump(exclude_unset=True)

        if "ma_qr" in update_data and update_data["ma_qr"]:
            if update_data["ma_qr"] != batch.ma_qr:
                existing = db.query(cfg.batch_model).filter(
                    cfg.batch_model.ma_qr == update_data["ma_qr"],
                    cfg.batch_model.lohang_id != batch_id,
                ).first()
                if existing:
                    raise DomainError(status_code=400, detail=f"Mã QR '{update_data['ma_qr']}' đã tồn tại")

        ngay_het_han = update_data.get("ngay_het_han", batch.ngay_het_han)
        baseline = (
            update_data.get("ngay_san_xuat", batch.ngay_san_xuat)
            if kind == "products"
            else batch.ngay_nhap
        )
        if ngay_het_han <= baseline:
            detail = "Ngày hết hạn phải sau ngày sản xuất" if kind == "products" else "Ngày hết hạn phải sau ngày nhập"
            raise DomainError(status_code=400, detail=detail)

        for field, value in update_data.items():
            setattr(batch, field, value)

        db.commit()
        db.refresh(batch)
        if {"ngay_san_xuat", "ngay_het_han", "trang_thai"} & update_data.keys():
            _refresh_proactive_expiry_insights(db)
        return self._to_response(cfg, batch, self._get_inventory(db, cfg, batch.lohang_id))

    # ------------------------------------------------------------------
    # Reporting endpoints — kept close to their original per-kind shape;
    # see module docstring for why these weren't generalized like the CRUD.
    # ------------------------------------------------------------------
    def get_expiring_batches(self, db: Session, days: int) -> dict:
        cutoff_date = datetime.now() + timedelta(days=days)
        now = datetime.now()

        product_batches = db.query(LoHangSanPham, TonKhoSanPham, BienTheSanPham, SanPham).join(
            TonKhoSanPham, TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id
        ).join(
            BienTheSanPham, BienTheSanPham.bienthe_id == LoHangSanPham.bienthe_sanpham_id
        ).join(
            SanPham, SanPham.sanpham_id == BienTheSanPham.sanpham_id
        ).filter(
            and_(
                LoHangSanPham.ngay_het_han <= cutoff_date,
                LoHangSanPham.ngay_het_han > now,
                LoHangSanPham.trang_thai == "hoatdong",
                TonKhoSanPham.so_luong_hien_tai > 0,
            )
        ).order_by(LoHangSanPham.ngay_het_han.asc()).all()

        component_batches = db.query(LoHangLinhKien, TonKhoLinhKien, LinhKien).join(
            TonKhoLinhKien, TonKhoLinhKien.lohang_linhkien_id == LoHangLinhKien.lohang_id
        ).join(
            LinhKien, LinhKien.linh_kien_id == LoHangLinhKien.linh_kien_id
        ).filter(
            and_(
                LoHangLinhKien.ngay_het_han <= cutoff_date,
                LoHangLinhKien.ngay_het_han > now,
                LoHangLinhKien.trang_thai == "hoatdong",
                TonKhoLinhKien.so_luong_hien_tai > 0,
            )
        ).order_by(LoHangLinhKien.ngay_het_han.asc()).all()

        gift_box_batches = db.query(LoHangHopQua, TonKhoHopQua, HopQua).join(
            TonKhoHopQua, TonKhoHopQua.lohang_hopqua_id == LoHangHopQua.lohang_id
        ).join(
            HopQua, HopQua.hop_qua_id == LoHangHopQua.hop_qua_id
        ).filter(
            and_(
                LoHangHopQua.ngay_het_han <= cutoff_date,
                LoHangHopQua.ngay_het_han > now,
                LoHangHopQua.trang_thai == "hoatdong",
                TonKhoHopQua.so_luong_hien_tai > 0,
            )
        ).order_by(LoHangHopQua.ngay_het_han.asc()).all()

        return {
            "products": [
                {
                    "lohang_id": lo.lohang_id,
                    "ma_lo": lo.ma_lo,
                    "ngay_het_han": lo.ngay_het_han,
                    "so_luong_hien_tai": tk.so_luong_hien_tai,
                    "ten": f"{sp.ten} - {bv.huong_vi}",
                }
                for lo, tk, bv, sp in product_batches
            ],
            "components": [
                {
                    "lohang_id": lo.lohang_id,
                    "ma_lo": lo.ma_lo,
                    "ngay_het_han": lo.ngay_het_han,
                    "so_luong_hien_tai": tk.so_luong_hien_tai,
                    "ten": lk.ten_linh_kien,
                }
                for lo, tk, lk in component_batches
            ],
            "gift_boxes": [
                {
                    "lohang_id": lo.lohang_id,
                    "ma_lo": lo.ma_lo,
                    "ngay_het_han": lo.ngay_het_han,
                    "so_luong_hien_tai": tk.so_luong_hien_tai,
                    "ten": hq.ten_hop_qua,
                }
                for lo, tk, hq in gift_box_batches
            ],
        }

    def get_product_inventory(self, db: Session, bienthe_id: Optional[int]) -> list[dict]:
        query = db.query(TonKhoSanPham, LoHangSanPham, BienTheSanPham, SanPham).join(
            LoHangSanPham, LoHangSanPham.lohang_id == TonKhoSanPham.lohang_sanpham_id
        ).join(
            BienTheSanPham, BienTheSanPham.bienthe_id == LoHangSanPham.bienthe_sanpham_id
        ).join(
            SanPham, SanPham.sanpham_id == BienTheSanPham.sanpham_id
        ).filter(LoHangSanPham.trang_thai == "hoatdong")

        if bienthe_id:
            query = query.filter(LoHangSanPham.bienthe_sanpham_id == bienthe_id)

        results = query.order_by(LoHangSanPham.ngay_het_han.asc()).all()
        return [
            {
                "lohang_id": lo.lohang_id,
                "ma_lo": lo.ma_lo,
                "bienthe_id": bv.bienthe_id,
                "sanpham_id": sp.sanpham_id,
                "ten_sanpham": sp.ten,
                "huong_vi": bv.huong_vi,
                "kich_thuoc": bv.kich_thuoc,
                "so_luong_hien_tai": tk.so_luong_hien_tai,
                "so_luong_da_ban": tk.so_luong_da_ban,
                "ngay_het_han": lo.ngay_het_han,
            }
            for tk, lo, bv, sp in results
        ]

    def get_component_inventory(self, db: Session, linh_kien_id: Optional[int]) -> list[dict]:
        query = db.query(TonKhoLinhKien, LoHangLinhKien, LinhKien).join(
            LoHangLinhKien, LoHangLinhKien.lohang_id == TonKhoLinhKien.lohang_linhkien_id
        ).join(
            LinhKien, LinhKien.linh_kien_id == LoHangLinhKien.linh_kien_id
        ).filter(LoHangLinhKien.trang_thai == "hoatdong")

        if linh_kien_id:
            query = query.filter(LoHangLinhKien.linh_kien_id == linh_kien_id)

        results = query.order_by(LoHangLinhKien.ngay_het_han.asc()).all()
        return [
            {
                "lohang_id": lo.lohang_id,
                "ma_lo": lo.ma_lo,
                "linh_kien_id": lk.linh_kien_id,
                "ten_linh_kien": lk.ten_linh_kien,
                "so_luong_hien_tai": tk.so_luong_hien_tai,
                "so_luong_da_su_dung": tk.so_luong_da_su_dung,
                "ngay_het_han": lo.ngay_het_han,
            }
            for tk, lo, lk in results
        ]

    def get_gift_box_inventory(self, db: Session, hop_qua_id: Optional[int]) -> list[dict]:
        query = db.query(TonKhoHopQua, LoHangHopQua, HopQua).join(
            LoHangHopQua, LoHangHopQua.lohang_id == TonKhoHopQua.lohang_hopqua_id
        ).join(
            HopQua, HopQua.hop_qua_id == LoHangHopQua.hop_qua_id
        ).filter(LoHangHopQua.trang_thai == "hoatdong")

        if hop_qua_id:
            query = query.filter(LoHangHopQua.hop_qua_id == hop_qua_id)

        results = query.order_by(LoHangHopQua.ngay_het_han.asc()).all()
        return [
            {
                "lohang_id": lo.lohang_id,
                "ma_lo": lo.ma_lo,
                "hop_qua_id": hq.hop_qua_id,
                "ten_hop_qua": hq.ten_hop_qua,
                "so_luong_hien_tai": tk.so_luong_hien_tai,
                "so_luong_da_ban": tk.so_luong_da_ban,
                "ngay_het_han": lo.ngay_het_han,
            }
            for tk, lo, hq in results
        ]

    def batches_by_variant(self, db: Session, bienthe_id: int) -> list[dict]:
        rows = (
            db.query(LoHangSanPham, TonKhoSanPham)
            .join(TonKhoSanPham, TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id)
            .filter(
                LoHangSanPham.bienthe_sanpham_id == bienthe_id,
                TonKhoSanPham.so_luong_hien_tai > 0,
            )
            .order_by(LoHangSanPham.ngay_het_han.asc())
            .all()
        )
        return [
            {
                "lohang_id": lo.lohang_id,
                "ma_lo": lo.ma_lo,
                "ngay_het_han": lo.ngay_het_han,
                "so_luong_con": tk.so_luong_hien_tai,
                "gia_don_vi": float(lo.gia_don_vi),
            }
            for lo, tk in rows
        ]
