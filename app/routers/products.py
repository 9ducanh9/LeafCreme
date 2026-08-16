"""
Products Router: CRUD operations cho sản phẩm và biến thể

Thin by design — see app.services.products.ProductService for the business
logic (moved out as part of the Phase 1 service-layer migration).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy import Date, cast, func, select
from sqlalchemy.orm import Session
from typing import Literal, Optional, List, Union
from enum import Enum
from decimal import Decimal
from datetime import date, datetime

from ..db import get_db
from ..core.dependencies import get_current_active_user, require_role, get_optional_user
from ..models import BienTheSanPham, LoHangSanPham, NguoiDung, TonKhoSanPham
from ..services.products import ProductService, DomainError
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


class ProductAvailabilityResponse(BaseModel):
    bienthe_id: int
    so_luong_con: int
    ngay_het_han_som_nhat: Optional[datetime]
    dang_ban_duoc: bool


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
    current_user: NguoiDung = Depends(require_role("admin", "manager"))
):
    """Tạo sản phẩm mới (yêu cầu admin/manager)"""
    try:
        return product_service.create_product(db, product_data)
    except DomainError as exc:
        _raise_http(exc)


@router.post("/upload-image", status_code=status.HTTP_200_OK)
async def upload_product_image(
    file: UploadFile = File(...),
    current_user: NguoiDung = Depends(require_role("admin", "manager")),
):
    """Upload ảnh sản phẩm - PHẢI ĐẶT TRƯỚC /{product_id} để tránh conflict"""
    file_content = await file.read()
    try:
        image_path = product_service.store_product_image(file.content_type, file.filename, file_content)
    except DomainError as exc:
        _raise_http(exc)
    return JSONResponse({"image_path": image_path, "message": "Upload ảnh thành công"})


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
    current_user: NguoiDung = Depends(require_role("admin", "manager"))
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
    current_user: NguoiDung = Depends(require_role("admin", "manager"))
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
    current_user: NguoiDung = Depends(require_role("admin", "manager"))
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
    current_user: NguoiDung = Depends(get_current_active_user)
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
    current_user: NguoiDung = Depends(require_role("admin", "manager"))
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
    current_user: NguoiDung = Depends(require_role("admin", "manager"))
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
