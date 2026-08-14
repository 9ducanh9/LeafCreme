"""
Product domain service.

Extracted from app/routers/products.py (Phase 1 service-layer migration —
same pattern as payments/batches/alerts/gift_boxes). Returns ORM objects
directly (not dicts) for the CRUD methods, matching the original router,
since FastAPI's `response_model=...` with `from_attributes=True` already
handles the ORM->Pydantic conversion — no need to hand-build dicts here
the way payments/batches/gift_boxes had to (those had extra computed
fields the ORM object alone didn't carry).
"""
import uuid
from pathlib import Path
from typing import Any, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import BienTheSanPham, SanPham
from app.services.errors import DomainError

_MAX_IMAGE_BYTES = 5 * 1024 * 1024


class ProductService:
    # ------------------------------------------------------------------
    # Products
    # ------------------------------------------------------------------
    def list_products(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        danh_muc: Optional[str] = None,
        loai: Optional[str] = None,
        dang_hoat_dong: Optional[bool] = None,
        paginated: bool = False,
        sort_by: str = "ngay_tao",
        sort_dir: str = "desc",
    ) -> list[SanPham] | dict:
        query = db.query(SanPham)
        if search:
            query = query.filter(or_(SanPham.ten.ilike(f"%{search}%"), SanPham.sku.ilike(f"%{search}%")))
        if danh_muc:
            query = query.filter(SanPham.danh_muc == danh_muc)
        if loai:
            query = query.filter(SanPham.loai == loai)
        if dang_hoat_dong is not None:
            query = query.filter(SanPham.dang_hoat_dong == dang_hoat_dong)
            if dang_hoat_dong:
                query = query.filter(or_(
                    SanPham.loai != "bien_the",
                    SanPham.bienthe_list.any(BienTheSanPham.dang_hoat_dong.is_(True)),
                ))

        if not paginated:
            return query.order_by(SanPham.sanpham_id.desc()).offset(skip).limit(limit).all()

        total = query.count()
        sort_map = {
            "ten": SanPham.ten,
            "gia_co_ban": SanPham.gia_co_ban,
            "danh_muc": SanPham.danh_muc,
            "ngay_tao": SanPham.ngay_tao,
        }
        sort_column = sort_map.get(sort_by, SanPham.ngay_tao)
        direction = sort_column.asc() if sort_dir == "asc" else sort_column.desc()
        items = query.order_by(direction, SanPham.sanpham_id.asc()).offset(skip).limit(limit).all()
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    def get_product(self, db: Session, product_id: int) -> SanPham:
        product = db.query(SanPham).filter(SanPham.sanpham_id == product_id).first()
        if not product:
            raise DomainError(status_code=404, detail=f"Sản phẩm với ID {product_id} không tồn tại")
        return product

    def create_product(self, db: Session, payload: Any) -> SanPham:
        existing = db.query(SanPham).filter(SanPham.sku == payload.sku).first()
        if existing:
            raise DomainError(status_code=400, detail=f"SKU '{payload.sku}' đã tồn tại")

        product = SanPham(**payload.model_dump())
        db.add(product)
        db.commit()
        db.refresh(product)
        return product

    def update_product(self, db: Session, product_id: int, payload: Any) -> SanPham:
        product = self.get_product(db, product_id)
        update_data = payload.model_dump(exclude_unset=True)

        if "sku" in update_data and update_data["sku"] != product.sku:
            existing = db.query(SanPham).filter(
                SanPham.sku == update_data["sku"], SanPham.sanpham_id != product_id,
            ).first()
            if existing:
                raise DomainError(status_code=400, detail=f"SKU '{update_data['sku']}' đã tồn tại")

        for field, value in update_data.items():
            setattr(product, field, value)

        db.commit()
        db.refresh(product)
        return product

    def delete_product(self, db: Session, product_id: int) -> None:
        """Soft delete — set dang_hoat_dong=False."""
        product = self.get_product(db, product_id)
        product.dang_hoat_dong = False
        db.commit()

    # ------------------------------------------------------------------
    # Variants
    # ------------------------------------------------------------------
    def get_variant(self, db: Session, variant_id: int) -> BienTheSanPham:
        variant = db.query(BienTheSanPham).filter(BienTheSanPham.bienthe_id == variant_id).first()
        if not variant:
            raise DomainError(status_code=404, detail=f"Biến thể với ID {variant_id} không tồn tại")
        return variant

    def create_variant(self, db: Session, payload: Any) -> BienTheSanPham:
        product = db.query(SanPham).filter(SanPham.sanpham_id == payload.sanpham_id).first()
        if not product:
            raise DomainError(status_code=404, detail=f"Sản phẩm với ID {payload.sanpham_id} không tồn tại")

        if payload.sku_bienthe:
            existing = db.query(BienTheSanPham).filter(
                BienTheSanPham.sku_bienthe == payload.sku_bienthe
            ).first()
            if existing:
                raise DomainError(status_code=400, detail=f"SKU biến thể '{payload.sku_bienthe}' đã tồn tại")

        variant = BienTheSanPham(**payload.model_dump())
        db.add(variant)
        db.commit()
        db.refresh(variant)
        return variant

    def update_variant(self, db: Session, variant_id: int, payload: Any) -> BienTheSanPham:
        variant = self.get_variant(db, variant_id)
        update_data = payload.model_dump(exclude_unset=True)

        if "sku_bienthe" in update_data and update_data["sku_bienthe"]:
            if update_data["sku_bienthe"] != variant.sku_bienthe:
                existing = db.query(BienTheSanPham).filter(
                    BienTheSanPham.sku_bienthe == update_data["sku_bienthe"],
                    BienTheSanPham.bienthe_id != variant_id,
                ).first()
                if existing:
                    raise DomainError(status_code=400, detail=f"SKU biến thể '{update_data['sku_bienthe']}' đã tồn tại")

        for field, value in update_data.items():
            setattr(variant, field, value)

        db.commit()
        db.refresh(variant)
        return variant

    def delete_variant(self, db: Session, variant_id: int) -> None:
        """Soft delete — set dang_hoat_dong=False."""
        variant = self.get_variant(db, variant_id)
        variant.dang_hoat_dong = False

        has_active_variant = db.query(BienTheSanPham.bienthe_id).filter(
            BienTheSanPham.sanpham_id == variant.sanpham_id,
            BienTheSanPham.dang_hoat_dong.is_(True),
        ).first()
        if not has_active_variant:
            variant.sanpham.dang_hoat_dong = False

        db.commit()

    def get_product_variants(self, db: Session, product_id: int) -> list[BienTheSanPham]:
        self.get_product(db, product_id)
        return db.query(BienTheSanPham).filter(
            BienTheSanPham.sanpham_id == product_id
        ).order_by(BienTheSanPham.bienthe_id).all()

    # ------------------------------------------------------------------
    # Image upload — pure file I/O, no DB access, but kept here for
    # testability/consistency instead of living in the router.
    # ------------------------------------------------------------------
    def store_product_image(self, content_type: Optional[str], filename: Optional[str], file_content: bytes) -> str:
        if not content_type or not content_type.startswith("image/"):
            raise DomainError(status_code=400, detail="File phải là ảnh")

        if len(file_content) > _MAX_IMAGE_BYTES:
            raise DomainError(status_code=400, detail="Kích thước file không được vượt quá 5MB")

        upload_dir = Path("uploads/product")
        upload_dir.mkdir(parents=True, exist_ok=True)

        file_ext = Path(filename).suffix if filename else ".jpg"
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = upload_dir / unique_filename

        with open(file_path, "wb") as f:
            f.write(file_content)

        return f"product/{unique_filename}"
