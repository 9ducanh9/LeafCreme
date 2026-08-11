"""
Gift box domain service.

Extracted from app/routers/gift_boxes.py (Phase 1 service-layer migration —
same pattern as payments/batches/alerts). The original router had two
near-identical endpoint sets: an admin one and a "public" (unauthenticated,
active-only) one for the storefront, each re-implementing the same
gift-box/BOM serialization dicts. Both now go through the same service
methods, parameterized by an `active_only` flag instead of being
duplicated per router.
"""
from typing import Any, Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models import BienTheSanPham, HopQua, HopQuaBOM, SanPham
from app.services.errors import DomainError

_NOT_FOUND = "Hộp quà không tồn tại"
_NOT_FOUND_OR_INACTIVE = "Hộp quà không tồn tại hoặc không còn hoạt động"


class GiftBoxService:
    # ------------------------------------------------------------------
    # Serialization helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _to_gift_box_response(gb: HopQua) -> dict:
        return {
            "hop_qua_id": gb.hop_qua_id,
            "ten_hop_qua": gb.ten_hop_qua,
            "sku": gb.sku,
            "gia_ban": gb.gia_ban,
            "mo_ta": gb.mo_ta,
            "hinh_anh_url": gb.hinh_anh_url,
            "kich_thuoc": gb.kich_thuoc,
            "trong_luong": gb.trong_luong,
            "dang_hoat_dong": gb.dang_hoat_dong,
            "ngay_tao": gb.ngay_tao.isoformat(),
        }

    @staticmethod
    def _to_bom_response(bom: HopQuaBOM, variant: Optional[BienTheSanPham], product: Optional[SanPham]) -> dict:
        return {
            "bom_id": bom.bom_id,
            "hop_qua_id": bom.hop_qua_id,
            "bienthe_id": bom.bienthe_id,
            "so_luong": bom.so_luong,
            "ngay_tao": bom.ngay_tao.isoformat(),
            "variant_name": f"{variant.huong_vi} {variant.kich_thuoc or ''}".strip() if variant else None,
            "variant_price": variant.gia_bienthe if variant else None,
            "product_name": product.ten if product else None,
            "product_category": product.danh_muc if product else None,
            "variant_active": variant.dang_hoat_dong if variant else None,
        }

    def _get_gift_box_or_404(self, db: Session, gift_box_id: int, active_only: bool) -> HopQua:
        query = db.query(HopQua).filter(HopQua.hop_qua_id == gift_box_id)
        if active_only:
            query = query.filter(HopQua.dang_hoat_dong == True)  # noqa: E712 — matches original `== True` filter style
        gift_box = query.first()
        if not gift_box:
            raise DomainError(status_code=404, detail=_NOT_FOUND_OR_INACTIVE if active_only else _NOT_FOUND)
        return gift_box

    # ------------------------------------------------------------------
    # Gift boxes
    # ------------------------------------------------------------------
    def list_gift_boxes(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        dang_hoat_dong: Optional[bool] = None,
        min_price: Optional[Any] = None,
        max_price: Optional[Any] = None,
        default_active_only: bool = False,
        paginated: bool = False,
        sort_by: str = "ngay_tao",
        sort_dir: str = "desc",
    ) -> list[dict] | dict:
        query = db.query(HopQua)

        if dang_hoat_dong is None:
            if default_active_only:
                query = query.filter(HopQua.dang_hoat_dong == True)  # noqa: E712
        else:
            query = query.filter(HopQua.dang_hoat_dong == dang_hoat_dong)

        if search:
            query = query.filter(or_(
                HopQua.ten_hop_qua.ilike(f"%{search}%"),
                HopQua.sku.ilike(f"%{search}%"),
            ))
        if min_price:
            query = query.filter(HopQua.gia_ban >= min_price)
        if max_price:
            query = query.filter(HopQua.gia_ban <= max_price)

        if not paginated:
            gift_boxes = query.order_by(HopQua.ngay_tao.desc(), HopQua.hop_qua_id.asc()).offset(skip).limit(limit).all()
            return [self._to_gift_box_response(gb) for gb in gift_boxes]

        total = query.count()
        sort_map = {"ten": HopQua.ten_hop_qua, "gia": HopQua.gia_ban, "ngay_tao": HopQua.ngay_tao}
        sort_column = sort_map.get(sort_by, HopQua.ngay_tao)
        direction = sort_column.asc() if sort_dir == "asc" else sort_column.desc()
        gift_boxes = query.order_by(direction, HopQua.hop_qua_id.asc()).offset(skip).limit(limit).all()
        return {"items": [self._to_gift_box_response(gb) for gb in gift_boxes], "total": total, "skip": skip, "limit": limit}

    def get_gift_box(self, db: Session, gift_box_id: int, active_only: bool = False) -> dict:
        gift_box = self._get_gift_box_or_404(db, gift_box_id, active_only)
        return self._to_gift_box_response(gift_box)

    def create_gift_box(self, db: Session, payload: Any) -> dict:
        if payload.sku:
            existing = db.query(HopQua).filter(HopQua.sku == payload.sku).first()
            if existing:
                raise DomainError(status_code=400, detail="SKU đã tồn tại")
        else:
            max_id = db.query(func.max(HopQua.hop_qua_id)).scalar() or 0
            payload.sku = f"GIFTBOX-{max_id + 1}"

        new_gift_box = HopQua(**payload.model_dump())
        db.add(new_gift_box)
        db.commit()
        db.refresh(new_gift_box)
        return self._to_gift_box_response(new_gift_box)

    def update_gift_box(self, db: Session, gift_box_id: int, payload: Any) -> dict:
        gift_box = self._get_gift_box_or_404(db, gift_box_id, active_only=False)

        if payload.sku and payload.sku != gift_box.sku:
            existing = db.query(HopQua).filter(
                HopQua.sku == payload.sku, HopQua.hop_qua_id != gift_box_id,
            ).first()
            if existing:
                raise DomainError(status_code=400, detail="SKU đã tồn tại")

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(gift_box, field, value)

        db.commit()
        db.refresh(gift_box)
        return self._to_gift_box_response(gift_box)

    def delete_gift_box(self, db: Session, gift_box_id: int) -> None:
        """Soft-delete — sets dang_hoat_dong=False, matching
        ProductService.delete_product's pattern.

        Was previously a real db.delete(gift_box). HopQuaBOM and
        LoHangHopQua both cascade-delete with the gift box at the DB
        level, so a gift box that had ever had inventory batches created
        for it (even if never sold) would silently lose that batch/ledger
        history. A gift box that had actually been sold (ChiTietDonHang
        references it, no cascade there) would instead hit an unhandled
        IntegrityError -> bare 500. See
        docs/specs/05-products-giftboxes.md Finding #1.
        """
        gift_box = self._get_gift_box_or_404(db, gift_box_id, active_only=False)
        gift_box.dang_hoat_dong = False
        db.commit()

    # ------------------------------------------------------------------
    # BOM
    # ------------------------------------------------------------------
    def list_bom(self, db: Session, gift_box_id: int, active_only: bool = False) -> list[dict]:
        self._get_gift_box_or_404(db, gift_box_id, active_only)

        bom_items = (
            db.query(HopQuaBOM, BienTheSanPham, SanPham)
            .join(BienTheSanPham, HopQuaBOM.bienthe_id == BienTheSanPham.bienthe_id)
            .join(SanPham, BienTheSanPham.sanpham_id == SanPham.sanpham_id)
            .filter(HopQuaBOM.hop_qua_id == gift_box_id)
            .all()
        )
        return [self._to_bom_response(bom, variant, product) for bom, variant, product in bom_items]

    def add_bom_item(self, db: Session, gift_box_id: int, payload: Any) -> dict:
        self._get_gift_box_or_404(db, gift_box_id, active_only=False)

        variant = db.query(BienTheSanPham).filter(BienTheSanPham.bienthe_id == payload.bienthe_id).first()
        if not variant:
            raise DomainError(status_code=404, detail="Biến thể sản phẩm không tồn tại")

        existing = db.query(HopQuaBOM).filter(
            HopQuaBOM.hop_qua_id == gift_box_id, HopQuaBOM.bienthe_id == payload.bienthe_id,
        ).first()
        if existing:
            raise DomainError(
                status_code=400,
                detail="Biến thể này đã có trong BOM. Hãy cập nhật số lượng thay vì thêm mới.",
            )

        new_item = HopQuaBOM(hop_qua_id=gift_box_id, bienthe_id=payload.bienthe_id, so_luong=payload.so_luong)
        db.add(new_item)
        db.commit()
        db.refresh(new_item)

        product = db.query(SanPham).filter(SanPham.sanpham_id == variant.sanpham_id).first()
        return self._to_bom_response(new_item, variant, product)

    def update_bom_item(self, db: Session, gift_box_id: int, bom_id: int, payload: Any) -> dict:
        bom = db.query(HopQuaBOM).filter(
            HopQuaBOM.bom_id == bom_id, HopQuaBOM.hop_qua_id == gift_box_id,
        ).first()
        if not bom:
            raise DomainError(status_code=404, detail="BOM item không tồn tại")

        bom.so_luong = payload.so_luong
        db.commit()
        db.refresh(bom)

        variant = db.query(BienTheSanPham).filter(BienTheSanPham.bienthe_id == bom.bienthe_id).first()
        product = db.query(SanPham).filter(SanPham.sanpham_id == variant.sanpham_id).first() if variant else None
        return self._to_bom_response(bom, variant, product)

    def delete_bom_item(self, db: Session, gift_box_id: int, bom_id: int) -> None:
        bom = db.query(HopQuaBOM).filter(
            HopQuaBOM.bom_id == bom_id, HopQuaBOM.hop_qua_id == gift_box_id,
        ).first()
        if not bom:
            raise DomainError(status_code=404, detail="BOM item không tồn tại")

        remaining_count = db.query(HopQuaBOM).filter(HopQuaBOM.hop_qua_id == gift_box_id).count()
        if remaining_count <= 1:
            raise DomainError(status_code=400, detail="Hộp quà phải có ít nhất 1 item trong BOM")

        db.delete(bom)
        db.commit()
