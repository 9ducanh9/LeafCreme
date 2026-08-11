"""
Gift Boxes Router: CRUD operations cho hộp quà và BOM

Thin by design — see app.services.gift_boxes.GiftBoxService for the
business logic (moved out as part of the Phase 1 service-layer migration).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from enum import Enum
from typing import Literal, Optional, List, Union
from decimal import Decimal

from ..db import get_db
from ..core.dependencies import require_role, get_optional_user
from ..models import NguoiDung
from ..services.gift_boxes import GiftBoxService, DomainError
from pydantic import BaseModel, Field
from ..schemas import Page

router = APIRouter(prefix="/admin/gift-boxes", tags=["gift-boxes"])

# Public router for customer-facing pages (read-only, no auth required)
public_router = APIRouter(prefix="/gift-boxes", tags=["gift-boxes-public"])

gift_box_service = GiftBoxService()


def _raise_http(exc: DomainError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)


# =========================================================
# Pydantic Schemas - Gift Boxes
# =========================================================
class GiftBoxCreate(BaseModel):
    ten_hop_qua: str = Field(..., min_length=1, max_length=200)
    sku: Optional[str] = Field(None, max_length=50)
    gia_ban: Decimal = Field(..., gt=0)
    mo_ta: Optional[str] = None
    hinh_anh_url: Optional[str] = Field(None, max_length=500)
    kich_thuoc: Optional[str] = Field(None, max_length=100)
    trong_luong: Optional[Decimal] = None
    dang_hoat_dong: bool = Field(default=True)


class GiftBoxUpdate(BaseModel):
    ten_hop_qua: Optional[str] = Field(None, min_length=1, max_length=200)
    sku: Optional[str] = Field(None, max_length=50)
    gia_ban: Optional[Decimal] = Field(None, gt=0)
    mo_ta: Optional[str] = None
    hinh_anh_url: Optional[str] = Field(None, max_length=500)
    kich_thuoc: Optional[str] = Field(None, max_length=100)
    trong_luong: Optional[Decimal] = None
    dang_hoat_dong: Optional[bool] = None


class GiftBoxResponse(BaseModel):
    hop_qua_id: int
    ten_hop_qua: str
    sku: Optional[str]
    gia_ban: Decimal
    mo_ta: Optional[str]
    hinh_anh_url: Optional[str]
    kich_thuoc: Optional[str]
    trong_luong: Optional[Decimal]
    dang_hoat_dong: bool
    ngay_tao: str

    class Config:
        from_attributes = True


class GiftBoxSortField(str, Enum):
    ten = "ten"
    gia = "gia"
    ngay_tao = "ngay_tao"


# =========================================================
# Pydantic Schemas - BOM
# =========================================================
class BomItemCreate(BaseModel):
    bienthe_id: int = Field(..., gt=0)
    so_luong: int = Field(..., gt=0)


class BomItemUpdate(BaseModel):
    so_luong: int = Field(..., gt=0)


class BomItemResponse(BaseModel):
    bom_id: int
    hop_qua_id: int
    bienthe_id: int
    so_luong: int
    ngay_tao: str
    # Variant details
    variant_name: Optional[str] = None
    variant_price: Optional[Decimal] = None
    product_name: Optional[str] = None
    product_category: Optional[str] = None
    variant_active: Optional[bool] = None

    class Config:
        from_attributes = True


# =========================================================
# Gift Box Endpoints
# =========================================================
@router.get("", response_model=Union[List[GiftBoxResponse], Page[GiftBoxResponse]])
def list_gift_boxes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    paginated: bool = Query(False),
    sort_by: GiftBoxSortField = Query(GiftBoxSortField.ngay_tao),
    sort_dir: Literal["asc", "desc"] = Query("desc"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên hoặc SKU"),
    dang_hoat_dong: Optional[bool] = Query(None),
    min_price: Optional[Decimal] = Query(None, gt=0),
    max_price: Optional[Decimal] = Query(None, gt=0),
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff")),
    db: Session = Depends(get_db)
):
    """Danh sách hộp quà"""
    return gift_box_service.list_gift_boxes(
        db, skip=skip, limit=limit, search=search, dang_hoat_dong=dang_hoat_dong,
        min_price=min_price, max_price=max_price,
        paginated=paginated, sort_by=sort_by.value, sort_dir=sort_dir,
    )


@router.get("/{gift_box_id}", response_model=GiftBoxResponse)
def get_gift_box(
    gift_box_id: int,
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff")),
    db: Session = Depends(get_db)
):
    """Lấy thông tin một hộp quà"""
    try:
        return gift_box_service.get_gift_box(db, gift_box_id)
    except DomainError as exc:
        _raise_http(exc)


@router.post("", response_model=GiftBoxResponse, status_code=status.HTTP_201_CREATED)
def create_gift_box(
    gift_box_data: GiftBoxCreate,
    current_user: NguoiDung = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db)
):
    """Tạo hộp quà mới"""
    try:
        return gift_box_service.create_gift_box(db, gift_box_data)
    except DomainError as exc:
        _raise_http(exc)


@router.put("/{gift_box_id}", response_model=GiftBoxResponse)
def update_gift_box(
    gift_box_id: int,
    gift_box_data: GiftBoxUpdate,
    current_user: NguoiDung = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db)
):
    """Cập nhật hộp quà"""
    try:
        return gift_box_service.update_gift_box(db, gift_box_id, gift_box_data)
    except DomainError as exc:
        _raise_http(exc)


@router.delete("/{gift_box_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gift_box(
    gift_box_id: int,
    current_user: NguoiDung = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Xóa hộp quà (cascade sẽ xóa BOM)"""
    try:
        gift_box_service.delete_gift_box(db, gift_box_id)
    except DomainError as exc:
        _raise_http(exc)
    return None


# =========================================================
# BOM Endpoints
# =========================================================
@router.get("/{gift_box_id}/bom", response_model=List[BomItemResponse])
def get_gift_box_bom(
    gift_box_id: int,
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff")),
    db: Session = Depends(get_db)
):
    """Lấy danh sách BOM của hộp quà"""
    try:
        return gift_box_service.list_bom(db, gift_box_id)
    except DomainError as exc:
        _raise_http(exc)


@router.post("/{gift_box_id}/bom", response_model=BomItemResponse, status_code=status.HTTP_201_CREATED)
def add_bom_item(
    gift_box_id: int,
    bom_item: BomItemCreate,
    current_user: NguoiDung = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db)
):
    """Thêm item vào BOM"""
    try:
        return gift_box_service.add_bom_item(db, gift_box_id, bom_item)
    except DomainError as exc:
        _raise_http(exc)


@router.put("/{gift_box_id}/bom/{bom_id}", response_model=BomItemResponse)
def update_bom_item(
    gift_box_id: int,
    bom_id: int,
    bom_item: BomItemUpdate,
    current_user: NguoiDung = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db)
):
    """Cập nhật số lượng BOM item"""
    try:
        return gift_box_service.update_bom_item(db, gift_box_id, bom_id, bom_item)
    except DomainError as exc:
        _raise_http(exc)


@router.delete("/{gift_box_id}/bom/{bom_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bom_item(
    gift_box_id: int,
    bom_id: int,
    current_user: NguoiDung = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db)
):
    """Xóa BOM item"""
    try:
        gift_box_service.delete_bom_item(db, gift_box_id, bom_id)
    except DomainError as exc:
        _raise_http(exc)
    return None


# =========================================================
# Public Endpoints (Customer-facing, no auth required)
# =========================================================
@public_router.get("", response_model=Union[List[GiftBoxResponse], Page[GiftBoxResponse]])
def list_gift_boxes_public(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    paginated: bool = Query(False),
    sort_by: GiftBoxSortField = Query(GiftBoxSortField.ngay_tao),
    sort_dir: Literal["asc", "desc"] = Query("desc"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên hoặc SKU"),
    dang_hoat_dong: Optional[bool] = Query(None, description="Lọc theo trạng thái hoạt động"),
    min_price: Optional[Decimal] = Query(None, gt=0),
    max_price: Optional[Decimal] = Query(None, gt=0),
    db: Session = Depends(get_db),
    current_user: Optional[NguoiDung] = Depends(get_optional_user)
):
    """Danh sách hộp quà (public - mặc định chỉ hiển thị hộp quà đang hoạt động)"""
    return gift_box_service.list_gift_boxes(
        db, skip=skip, limit=limit, search=search, dang_hoat_dong=dang_hoat_dong,
        min_price=min_price, max_price=max_price, default_active_only=True,
        paginated=paginated, sort_by=sort_by.value, sort_dir=sort_dir,
    )


@public_router.get("/{gift_box_id}", response_model=GiftBoxResponse)
def get_gift_box_public(
    gift_box_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[NguoiDung] = Depends(get_optional_user)
):
    """Lấy thông tin một hộp quà (public - chỉ hiển thị nếu đang hoạt động)"""
    try:
        return gift_box_service.get_gift_box(db, gift_box_id, active_only=True)
    except DomainError as exc:
        _raise_http(exc)


@public_router.get("/{gift_box_id}/bom", response_model=List[BomItemResponse])
def get_gift_box_bom_public(
    gift_box_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[NguoiDung] = Depends(get_optional_user)
):
    """Lấy danh sách BOM của hộp quà (public - chỉ hiển thị nếu hộp quà đang hoạt động)"""
    try:
        return gift_box_service.list_bom(db, gift_box_id, active_only=True)
    except DomainError as exc:
        _raise_http(exc)
