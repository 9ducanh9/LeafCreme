"""
Products Router: CRUD operations cho sản phẩm và biến thể

Thin by design — see app.services.products.ProductService for the business
logic (moved out as part of the Phase 1 service-layer migration).
"""
import json

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy import Date, and_, cast, func, or_, select
from sqlalchemy.orm import Session
from typing import Literal, Optional, List, Union
from enum import Enum
from decimal import Decimal
from datetime import date, datetime

from ..db import get_db
from ..core.capabilities import require_capability
from ..core.dependencies import get_optional_user
from ..models import BienTheSanPham, LoHangSanPham, NguoiDung, SanPham, TonKhoSanPham
from ..services.products import ProductService, DomainError
from ..services.products.product_service import CropRect
from pydantic import BaseModel, ConfigDict, Field, field_validator
from ..schemas import Page

router = APIRouter(prefix="/products", tags=["products"])
product_service = ProductService()


def _raise_http(exc: DomainError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)


def _normalize_sku(value: str) -> str:
    """Uppercase + trim so 'cake-001' and 'CAKE-001' are always the same
    SKU. Applied at the schema boundary so every write path (create and
    update, product and variant) goes through one place; the uniqueness
    checks in ProductService compare with plain `==`, which only actually
    catches case-insensitive duplicates because callers are guaranteed to
    already be normalized by the time they get there."""
    normalized = value.strip().upper()
    if not normalized:
        raise ValueError("SKU không được để trống")
    return normalized


# =========================================================
# Pydantic Schemas - Products
# =========================================================
class ProductCreate(BaseModel):
    ten: str = Field(..., min_length=1, max_length=200)
    sku: str = Field(..., min_length=1, max_length=50)
    loai: str = Field(default="don", pattern="^(don|bien_the)$")
    gia_co_ban: Decimal = Field(..., gt=0)
    mo_ta: Optional[str] = None
    hinh_anh_url: Optional[str] = Field(None, max_length=500)
    danh_muc: Optional[str] = Field(None, max_length=100)
    don_vi_tinh: Optional[str] = Field(default="chiếc", max_length=20)
    han_su_dung_ngay: Optional[int] = Field(None, ge=1, le=3650)
    phu_hop_dip: Optional[List[str]] = Field(
        None,
        description="Danh sách dịp phù hợp (đồng bộ với GiftBoxOccasion): birthday, thanks, love, holiday, self_care"
    )
    dang_hoat_dong: bool = Field(default=True)

    @field_validator("sku")
    @classmethod
    def _normalize_sku_required(cls, value: str) -> str:
        return _normalize_sku(value)


class ProductUpdate(BaseModel):
    ten: Optional[str] = Field(None, min_length=1, max_length=200)
    sku: Optional[str] = Field(None, min_length=1, max_length=50)
    loai: Optional[str] = Field(None, pattern="^(don|bien_the)$")
    gia_co_ban: Optional[Decimal] = Field(None, gt=0)
    mo_ta: Optional[str] = None
    hinh_anh_url: Optional[str] = Field(None, max_length=500)
    danh_muc: Optional[str] = Field(None, max_length=100)
    don_vi_tinh: Optional[str] = Field(None, max_length=20)
    han_su_dung_ngay: Optional[int] = Field(None, ge=1, le=3650)
    phu_hop_dip: Optional[List[str]] = Field(
        None,
        description="Danh sách dịp phù hợp (đồng bộ với GiftBoxOccasion): birthday, thanks, love, holiday, self_care"
    )
    dang_hoat_dong: Optional[bool] = None

    @field_validator("sku")
    @classmethod
    def _normalize_sku_optional(cls, value: Optional[str]) -> Optional[str]:
        return _normalize_sku(value) if value is not None else value


class ProductResponse(BaseModel):
    sanpham_id: int
    ten: str
    sku: str
    loai: str
    gia_co_ban: float
    mo_ta: Optional[str]
    hinh_anh_url: Optional[str]
    danh_muc: Optional[str]
    don_vi_tinh: Optional[str]
    han_su_dung_ngay: Optional[int]
    phu_hop_dip: Optional[List[str]]
    dang_hoat_dong: bool
    ngay_tao: datetime
    ngay_cap_nhat: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductSortField(str, Enum):
    ten = "ten"
    gia_co_ban = "gia_co_ban"
    danh_muc = "danh_muc"
    ngay_tao = "ngay_tao"


class VariantSortField(str, Enum):
    ten = "ten"
    huong_vi = "huong_vi"
    kich_thuoc = "kich_thuoc"
    gia = "gia"
    danh_muc = "danh_muc"
    ngay_tao = "ngay_tao"


# =========================================================
# Pydantic Schemas - Variants
# =========================================================
class VariantCreate(BaseModel):
    sanpham_id: int = Field(..., gt=0)
    huong_vi: str = Field(..., min_length=1, max_length=100)
    kich_thuoc: Optional[str] = Field(None, max_length=50)
    gia_bienthe: Decimal = Field(..., gt=0)
    sku_bienthe: Optional[str] = Field(None, max_length=50)
    muc_gioi_han_ton: int = Field(default=10, ge=0)
    dang_hoat_dong: bool = Field(default=True)

    @field_validator("sku_bienthe")
    @classmethod
    def _normalize_sku_bienthe(cls, value: Optional[str]) -> Optional[str]:
        return _normalize_sku(value) if value is not None else value


class VariantUpdate(BaseModel):
    huong_vi: Optional[str] = Field(None, min_length=1, max_length=100)
    kich_thuoc: Optional[str] = Field(None, max_length=50)
    gia_bienthe: Optional[Decimal] = Field(None, gt=0)
    sku_bienthe: Optional[str] = Field(None, max_length=50)
    muc_gioi_han_ton: Optional[int] = Field(None, ge=0)
    dang_hoat_dong: Optional[bool] = None

    @field_validator("sku_bienthe")
    @classmethod
    def _normalize_sku_bienthe(cls, value: Optional[str]) -> Optional[str]:
        return _normalize_sku(value) if value is not None else value


class VariantResponse(BaseModel):
    bienthe_id: int
    sanpham_id: int
    huong_vi: str
    kich_thuoc: Optional[str]
    gia_bienthe: float
    sku_bienthe: Optional[str]
    muc_gioi_han_ton: int
    dang_hoat_dong: bool
    ngay_tao: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminVariantRow(BaseModel):
    """One row in the admin catalog.

    The table is variant-shaped, but products of type ``don`` have no
    variant row.  ``bienthe_id=None`` keeps that case explicit instead of
    manufacturing a fake variant id in the API.
    """

    bienthe_id: int | None
    sanpham_id: int
    ten: str
    huong_vi: str | None
    kich_thuoc: str | None
    gia: Decimal
    sku: str | None
    product_sku: str
    han_su_dung_ngay: int | None
    danh_muc: str | None
    mo_ta: str | None
    hinh_anh_url: str | None
    dang_hoat_dong: bool

    model_config = ConfigDict(from_attributes=True)


class ProductAvailabilityResponse(BaseModel):
    bienthe_id: int
    so_luong_con: int
    ngay_het_han_som_nhat: Optional[datetime]
    dang_ban_duoc: bool


class CropRectPayload(BaseModel):
    x: int = Field(..., ge=0)
    y: int = Field(..., ge=0)
    width: int = Field(..., gt=0)
    height: int = Field(..., gt=0)


def _parse_crop_rect(raw_crop: str) -> CropRect:
    try:
        parsed = CropRectPayload.model_validate(json.loads(raw_crop))
    except (json.JSONDecodeError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=400, detail="Khung cắt ảnh không hợp lệ") from exc
    return CropRect(**parsed.model_dump())


# =========================================================
# Product Endpoints
# =========================================================
@router.get("", response_model=Union[List[ProductResponse], Page[ProductResponse]])
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    paginated: bool = Query(False),
    sort_by: ProductSortField = Query(ProductSortField.ngay_tao),
    sort_dir: Literal["asc", "desc"] = Query("desc"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên hoặc SKU"),
    danh_muc: Optional[str] = Query(None, description="Lọc theo danh mục"),
    loai: Optional[str] = Query(None, pattern="^(don|bien_the)$"),
    dang_hoat_dong: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[NguoiDung] = Depends(get_optional_user)
):
    """Danh sách sản phẩm với filters (public access)"""
    return product_service.list_products(
        db, skip=skip, limit=limit, search=search, danh_muc=danh_muc, loai=loai, dang_hoat_dong=dang_hoat_dong,
        paginated=paginated, sort_by=sort_by.value, sort_dir=sort_dir,
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("products.write"))
):
    """Tạo sản phẩm mới (yêu cầu admin/manager)"""
    try:
        return product_service.create_product(db, product_data)
    except DomainError as exc:
        _raise_http(exc)


@router.post("/upload-image", status_code=status.HTTP_200_OK)
async def upload_product_image(
    file: UploadFile = File(...),
    crop: Optional[str] = Form(default=None),
    current_user: NguoiDung = Depends(require_capability("products.write")),
):
    """Upload ảnh sản phẩm - PHẢI ĐẶT TRƯỚC /{product_id} để tránh conflict"""
    file_content = await file.read()
    try:
        crop_rect = _parse_crop_rect(crop) if crop else None
        result = product_service.store_product_image(
            file.content_type,
            file.filename,
            file_content,
            crop_rect=crop_rect,
        )
    except DomainError as exc:
        _raise_http(exc)
    return JSONResponse({**result, "message": "Upload ảnh thành công"})


@router.post("/recrop-image", status_code=status.HTTP_200_OK)
def recrop_product_image(
    original_path: str = Form(...),
    crop: str = Form(...),
    current_user: NguoiDung = Depends(require_capability("products.write")),
):
    """Cắt lại thumbnail từ ảnh gốc đã lưu, không cần upload lại."""
    try:
        result = product_service.recrop_product_image(original_path, _parse_crop_rect(crop))
    except DomainError as exc:
        _raise_http(exc)
    return JSONResponse({**result, "message": "Cắt lại ảnh thành công"})


@router.get("/categories", response_model=List[str])
def list_product_categories(
    db: Session = Depends(get_db),
    current_user: Optional[NguoiDung] = Depends(get_optional_user),
):
    """Danh mục sinh từ dữ liệu sản phẩm đang hoạt động."""
    rows = db.execute(
        select(SanPham.danh_muc)
        .where(SanPham.dang_hoat_dong.is_(True), SanPham.danh_muc.is_not(None))
        .distinct()
        .order_by(SanPham.danh_muc.asc())
    ).scalars().all()
    return [category for category in rows if category]


@router.get("/variants", response_model=Page[AdminVariantRow])
def list_admin_variants(
    search: Optional[str] = Query(None, description="Tên, SKU hoặc hương vị"),
    danh_muc: Optional[str] = Query(None, description="Lọc theo danh mục"),
    kich_thuoc: Optional[str] = Query(None, description="Lọc theo kích thước"),
    dang_hoat_dong: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    sort_by: VariantSortField = Query(VariantSortField.ten),
    sort_dir: Literal["asc", "desc"] = Query("asc"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("products.read")),
):
    """Catalog phẳng, mỗi dòng là một biến thể hoặc một sản phẩm ``don``."""
    query = db.query(SanPham, BienTheSanPham).outerjoin(
        BienTheSanPham,
        BienTheSanPham.sanpham_id == SanPham.sanpham_id,
    ).filter(
        # A variant product with no variants is not a catalog row.  A ``don``
        # product is intentionally retained with a NULL variant id.
        or_(SanPham.loai == "don", BienTheSanPham.bienthe_id.is_not(None)),
    )
    if search:
        needle = f"%{search.strip()}%"
        query = query.filter(or_(
            SanPham.ten.ilike(needle),
            SanPham.sku.ilike(needle),
            BienTheSanPham.huong_vi.ilike(needle),
            BienTheSanPham.sku_bienthe.ilike(needle),
        ))
    if danh_muc:
        query = query.filter(SanPham.danh_muc == danh_muc)
    if kich_thuoc:
        query = query.filter(BienTheSanPham.kich_thuoc == kich_thuoc)
    if dang_hoat_dong is not None:
        active_expression = or_(
            and_(SanPham.loai == "don", SanPham.dang_hoat_dong == dang_hoat_dong),
            and_(
                SanPham.loai == "bien_the",
                SanPham.dang_hoat_dong == dang_hoat_dong,
                BienTheSanPham.dang_hoat_dong == dang_hoat_dong,
            ),
        )
        query = query.filter(active_expression)

    total = query.count()
    sort_map = {
        VariantSortField.ten: SanPham.ten,
        VariantSortField.huong_vi: BienTheSanPham.huong_vi,
        VariantSortField.kich_thuoc: BienTheSanPham.kich_thuoc,
        VariantSortField.gia: func.coalesce(BienTheSanPham.gia_bienthe, SanPham.gia_co_ban),
        VariantSortField.danh_muc: SanPham.danh_muc,
        VariantSortField.ngay_tao: func.coalesce(BienTheSanPham.ngay_tao, SanPham.ngay_tao),
    }
    sort_column = sort_map[sort_by]
    ordering = sort_column.asc() if sort_dir == "asc" else sort_column.desc()
    rows = query.order_by(ordering, SanPham.sanpham_id.asc(), BienTheSanPham.bienthe_id.asc()).offset(skip).limit(limit).all()

    items = [
        AdminVariantRow(
            bienthe_id=variant.bienthe_id if variant else None,
            sanpham_id=product.sanpham_id,
            ten=product.ten,
            huong_vi=variant.huong_vi if variant else None,
            kich_thuoc=variant.kich_thuoc if variant else None,
            gia=variant.gia_bienthe if variant else product.gia_co_ban,
            sku=variant.sku_bienthe if variant and variant.sku_bienthe else product.sku,
            product_sku=product.sku,
            han_su_dung_ngay=product.han_su_dung_ngay,
            danh_muc=product.danh_muc,
            mo_ta=product.mo_ta,
            hinh_anh_url=product.hinh_anh_url,
            dang_hoat_dong=(variant.dang_hoat_dong if variant else product.dang_hoat_dong) and product.dang_hoat_dong,
        )
        for product, variant in rows
    ]
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/{product_id}/availability", response_model=List[ProductAvailabilityResponse])
def get_product_availability(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[NguoiDung] = Depends(get_optional_user),
):
    """Return sellable stock by variant, excluding inactive and expired lots."""
    variants = db.scalars(
        select(BienTheSanPham).where(
            BienTheSanPham.sanpham_id == product_id,
            BienTheSanPham.dang_hoat_dong.is_(True),
        )
    ).all()
    if not variants:
        return []

    today = date.today()
    rows = db.execute(
        select(
            LoHangSanPham.bienthe_sanpham_id,
            func.coalesce(func.sum(TonKhoSanPham.so_luong_hien_tai), 0),
            func.min(LoHangSanPham.ngay_het_han),
        )
        .join(TonKhoSanPham, TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id)
        .where(
            LoHangSanPham.bienthe_sanpham_id.in_([variant.bienthe_id for variant in variants]),
            LoHangSanPham.trang_thai == "hoatdong",
            cast(LoHangSanPham.ngay_het_han, Date) >= today,
            TonKhoSanPham.so_luong_hien_tai > 0,
        )
        .group_by(LoHangSanPham.bienthe_sanpham_id)
    ).all()
    stock_by_variant = {variant_id: (int(quantity or 0), earliest_expiry) for variant_id, quantity, earliest_expiry in rows}
    return [
        ProductAvailabilityResponse(
            bienthe_id=variant.bienthe_id,
            so_luong_con=stock_by_variant.get(variant.bienthe_id, (0, None))[0],
            ngay_het_han_som_nhat=stock_by_variant.get(variant.bienthe_id, (0, None))[1],
            dang_ban_duoc=stock_by_variant.get(variant.bienthe_id, (0, None))[0] > 0,
        )
        for variant in variants
    ]


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[NguoiDung] = Depends(get_optional_user)
):
    """Chi tiết sản phẩm (public access)"""
    try:
        return product_service.get_product(db, product_id)
    except DomainError as exc:
        _raise_http(exc)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("products.write"))
):
    """Cập nhật sản phẩm (yêu cầu admin/manager)"""
    try:
        return product_service.update_product(db, product_id, product_data)
    except DomainError as exc:
        _raise_http(exc)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("products.write"))
):
    """Xóa sản phẩm (soft delete - set dang_hoat_dong=False)"""
    try:
        product_service.delete_product(db, product_id)
    except DomainError as exc:
        _raise_http(exc)
    return None


# =========================================================
# Variant Endpoints (phải đặt trước /{product_id} để tránh conflict)
# =========================================================
@router.post("/variants", response_model=VariantResponse, status_code=status.HTTP_201_CREATED)
def create_variant(
    variant_data: VariantCreate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("products.write"))
):
    """Tạo biến thể mới (yêu cầu admin/manager)"""
    try:
        return product_service.create_variant(db, variant_data)
    except DomainError as exc:
        _raise_http(exc)


@router.get("/variants/{variant_id}", response_model=VariantResponse)
def get_variant(
    variant_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("products.read"))
):
    """Chi tiết biến thể"""
    try:
        return product_service.get_variant(db, variant_id)
    except DomainError as exc:
        _raise_http(exc)


@router.put("/variants/{variant_id}", response_model=VariantResponse)
def update_variant(
    variant_id: int,
    variant_data: VariantUpdate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("products.write"))
):
    """Cập nhật biến thể (yêu cầu admin/manager)"""
    try:
        return product_service.update_variant(db, variant_id, variant_data)
    except DomainError as exc:
        _raise_http(exc)


@router.delete("/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variant(
    variant_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("products.write"))
):
    """Xóa biến thể (soft delete - set dang_hoat_dong=False)"""
    try:
        product_service.delete_variant(db, variant_id)
    except DomainError as exc:
        _raise_http(exc)
    return None


@router.get("/{product_id}/variants", response_model=List[VariantResponse])
def get_product_variants(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[NguoiDung] = Depends(get_optional_user)
):
    """Danh sách biến thể của sản phẩm (public access)"""
    try:
        return product_service.get_product_variants(db, product_id)
    except DomainError as exc:
        _raise_http(exc)
