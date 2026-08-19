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
import io
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import BienTheSanPham, SanPham
from app.services.errors import DomainError

_MAX_IMAGE_BYTES = 5 * 1024 * 1024
_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Card/listing thumbnail: fixed size so grid layouts never depend on
# whatever aspect ratio a given upload happens to have.
_THUMBNAIL_RATIO = 4 / 3
_THUMBNAIL_SIZE = (800, 600)


@dataclass(frozen=True)
class CropRect:
    x: int
    y: int
    width: int
    height: int

    def clamped_to(self, image_width: int, image_height: int) -> "CropRect":
        x = max(0, min(self.x, image_width - 1))
        y = max(0, min(self.y, image_height - 1))
        width = max(1, min(self.width, image_width - x))
        height = max(1, min(self.height, image_height - y))
        return CropRect(x=x, y=y, width=width, height=height)


def crop_to_ratio(img: Image.Image, target_ratio: float = _THUMBNAIL_RATIO) -> Image.Image:
    """Crop an image to `target_ratio` (width/height), trimming the smaller
    dimension. A too-tall image is cropped 1/3 down from the top rather than
    centered — product photos usually have more headroom above the subject
    than below it, so a 1/3 offset keeps the subject in frame more often
    than a dead-center crop would."""
    w, h = img.size
    current_ratio = w / h
    if current_ratio > target_ratio:
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        return img.crop((left, 0, left + new_w, h))
    new_h = int(w / target_ratio)
    top = (h - new_h) // 3
    return img.crop((0, top, w, top + new_h))


def crop_to_rect(img: Image.Image, crop_rect: CropRect) -> Image.Image:
    rect = crop_rect.clamped_to(*img.size)
    current_ratio = rect.width / rect.height
    if current_ratio > _THUMBNAIL_RATIO:
        width = max(1, int(rect.height * _THUMBNAIL_RATIO))
        rect = CropRect(rect.x + (rect.width - width) // 2, rect.y, width, rect.height)
    elif current_ratio < _THUMBNAIL_RATIO:
        height = max(1, int(rect.width / _THUMBNAIL_RATIO))
        rect = CropRect(rect.x, rect.y + (rect.height - height) // 2, rect.width, height)
    return img.crop((rect.x, rect.y, rect.x + rect.width, rect.y + rect.height))


def _to_rgb(img: Image.Image) -> Image.Image:
    """Flatten transparency onto white instead of letting `.convert("RGB")`
    silently turn transparent pixels black."""
    if img.mode in ("RGBA", "LA", "P"):
        rgba = img.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.split()[-1])
        return background
    return img.convert("RGB")


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
    def store_product_image(
        self,
        content_type: Optional[str],
        filename: Optional[str],
        file_content: bytes,
        crop_rect: Optional[CropRect] = None,
    ) -> dict[str, str]:
        if content_type not in _ALLOWED_IMAGE_TYPES:
            raise DomainError(status_code=415, detail="Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP")

        if len(file_content) > _MAX_IMAGE_BYTES:
            raise DomainError(status_code=400, detail="Kích thước file không được vượt quá 5MB")

        if not file_content:
            raise DomainError(status_code=400, detail="File ảnh trống")

        upload_dir = Path("uploads/product")
        upload_dir.mkdir(parents=True, exist_ok=True)
        originals_dir = upload_dir / "originals"
        thumbnail_dir = upload_dir / "thumbnails"
        originals_dir.mkdir(parents=True, exist_ok=True)
        thumbnail_dir.mkdir(parents=True, exist_ok=True)

        image_id = uuid.uuid4().hex
        original_filename = f"{image_id}.jpg"
        thumbnail_filename = f"{image_id}_thumb.jpg"
        original_file_path = originals_dir / original_filename
        thumbnail_file_path = thumbnail_dir / thumbnail_filename

        try:
            with Image.open(io.BytesIO(file_content)) as source:
                source.load()
                normalized = _to_rgb(ImageOps.exif_transpose(source))
                normalized.save(original_file_path, "JPEG", quality=92)
                cropped = crop_to_rect(normalized, crop_rect) if crop_rect else crop_to_ratio(normalized)
                thumbnail = cropped.resize(_THUMBNAIL_SIZE, Image.LANCZOS)
                thumbnail.save(thumbnail_file_path, "JPEG", quality=88)
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            original_file_path.unlink(missing_ok=True)
            thumbnail_file_path.unlink(missing_ok=True)
            raise DomainError(status_code=400, detail="File ảnh không hợp lệ hoặc bị hỏng") from exc

        return {
            # Existing product writes persist image_path into SanPham.hinh_anh_url.
            "image_path": f"product/thumbnails/{thumbnail_filename}",
            "thumbnail_path": f"product/thumbnails/{thumbnail_filename}",
            "original_path": f"product/originals/{original_filename}",
        }

    def recrop_product_image(self, original_path: str, crop_rect: CropRect) -> dict[str, str]:
        originals_dir = (Path("uploads/product/originals")).resolve()
        requested_path = (Path("uploads") / original_path).resolve()
        if requested_path.parent != originals_dir or requested_path.suffix.lower() != ".jpg":
            raise DomainError(status_code=400, detail="Đường dẫn ảnh gốc không hợp lệ")
        if not requested_path.exists():
            raise DomainError(status_code=404, detail="Không tìm thấy ảnh gốc để cắt lại")

        image_id = requested_path.stem
        thumbnail_filename = f"{image_id}_thumb.jpg"
        thumbnail_file_path = Path("uploads/product/thumbnails") / thumbnail_filename
        try:
            with Image.open(requested_path) as source:
                normalized = _to_rgb(ImageOps.exif_transpose(source))
                thumbnail = crop_to_rect(normalized, crop_rect).resize(_THUMBNAIL_SIZE, Image.LANCZOS)
                thumbnail.save(thumbnail_file_path, "JPEG", quality=88)
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            raise DomainError(status_code=400, detail="Không thể cắt lại ảnh này") from exc

        return {
            "image_path": f"product/thumbnails/{thumbnail_filename}",
            "thumbnail_path": f"product/thumbnails/{thumbnail_filename}",
            "original_path": original_path,
        }
