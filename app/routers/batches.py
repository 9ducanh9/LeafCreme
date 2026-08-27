"""
Batches Router: CRUD operations cho lô hàng và tồn kho

Thin by design — validates input and translates DomainError -> HTTPException;
all business logic lives in app.services.batches.BatchService (see that
module's docstring for why create/list/get/update were generalized across
the three batch kinds instead of staying triplicated).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Literal, Optional, List
from enum import Enum
from decimal import Decimal
from datetime import date, datetime

from ..db import get_db
from ..core.capabilities import require_capability
from ..models import NguoiDung
from ..services.batches import BatchService, DomainError
from pydantic import BaseModel, ConfigDict, Field, model_validator
from ..schemas import Page

router = APIRouter(prefix="/batches", tags=["batches"])
batch_service = BatchService()


class BatchSortField(str, Enum):
    ngay_het_han = "ngay_het_han"
    ngay_san_xuat = "ngay_san_xuat"
    so_luong_hien_tai = "so_luong_hien_tai"
    ngay_tao = "ngay_tao"


class BatchDateValidationMixin(BaseModel):
    ngay_het_han: datetime

    @model_validator(mode="after")
    def validate_expiry_date(self):
        if self.ngay_het_han.date() < date.today():
            raise ValueError("Ngày hết hạn không được ở trước hôm nay")
        return self


class BatchUpdateDateValidationMixin(BaseModel):
    ngay_het_han: Optional[datetime] = None

    @model_validator(mode="after")
    def validate_expiry_date(self):
        if self.ngay_het_han is not None and self.ngay_het_han.date() < date.today():
            raise ValueError("Ngày hết hạn không được ở trước hôm nay")
        return self


def _raise_http(exc: DomainError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)


# =========================================================
# Pydantic Schemas - Product Batch
# =========================================================
class ProductBatchCreate(BaseModel):
    bienthe_sanpham_id: int = Field(..., gt=0)
    ncc_id: Optional[int] = Field(None, gt=0)
    ma_lo: str = Field(..., min_length=1, max_length=50)
    ngay_san_xuat: datetime = Field(default_factory=datetime.now)
    ngay_het_han: Optional[datetime] = None
    so_luong: int = Field(..., gt=0)
    gia_don_vi: Decimal = Field(..., gt=0)
    trang_thai: str = Field(default="hoatdong", pattern="^(hoatdong|tamdung|hethan|daxuathet)$")
    ma_qr: Optional[str] = Field(None, max_length=100)
    ghi_chu: Optional[str] = None

    @model_validator(mode="after")
    def validate_product_dates(self):
        if self.ngay_het_han is not None:
            if self.ngay_het_han.date() < date.today():
                raise ValueError("Ngày hết hạn không được ở trước hôm nay")
            if self.ngay_het_han <= self.ngay_san_xuat:
                raise ValueError("Ngày hết hạn phải sau ngày sản xuất")
        return self


class ProductBatchUpdate(BatchUpdateDateValidationMixin):
    ncc_id: Optional[int] = Field(None, gt=0)
    ngay_san_xuat: Optional[datetime] = None
    ngay_het_han: Optional[datetime] = None
    so_luong: Optional[int] = Field(None, gt=0)
    gia_don_vi: Optional[Decimal] = Field(None, gt=0)
    trang_thai: Optional[str] = Field(None, pattern="^(hoatdong|tamdung|hethan|daxuathet)$")
    ma_qr: Optional[str] = Field(None, max_length=100)
    ghi_chu: Optional[str] = None


class ProductBatchResponse(BaseModel):
    lohang_id: int
    bienthe_sanpham_id: int
    ncc_id: Optional[int]
    ma_lo: str
    ngay_nhap: datetime
    ngay_san_xuat: datetime
    ngay_het_han: datetime
    so_luong: int
    gia_don_vi: float
    trang_thai: str
    ma_qr: Optional[str]
    ghi_chu: Optional[str]
    ngay_tao: datetime
    so_luong_hien_tai: Optional[int] = None
    so_luong_da_ban: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# Pydantic Schemas - Component Batch
# =========================================================
class ComponentBatchCreate(BatchDateValidationMixin):
    linh_kien_id: int = Field(..., gt=0)
    ncc_id: Optional[int] = Field(None, gt=0)
    ma_lo: str = Field(..., min_length=1, max_length=50)
    ngay_het_han: datetime
    so_luong: int = Field(..., gt=0)
    gia_don_vi: Decimal = Field(..., gt=0)
    trang_thai: str = Field(default="hoatdong", pattern="^(hoatdong|tamdung|hethan|daxuathet)$")
    ma_qr: Optional[str] = Field(None, max_length=100)
    ghi_chu: Optional[str] = None


class ComponentBatchUpdate(BatchUpdateDateValidationMixin):
    ncc_id: Optional[int] = Field(None, gt=0)
    ngay_het_han: Optional[datetime] = None
    so_luong: Optional[int] = Field(None, gt=0)
    gia_don_vi: Optional[Decimal] = Field(None, gt=0)
    trang_thai: Optional[str] = Field(None, pattern="^(hoatdong|tamdung|hethan|daxuathet)$")
    ma_qr: Optional[str] = Field(None, max_length=100)
    ghi_chu: Optional[str] = None


class ComponentBatchResponse(BaseModel):
    lohang_id: int
    linh_kien_id: int
    ncc_id: Optional[int]
    ma_lo: str
    ngay_nhap: datetime
    ngay_het_han: datetime
    so_luong: int
    gia_don_vi: float
    trang_thai: str
    ma_qr: Optional[str]
    ghi_chu: Optional[str]
    ngay_tao: datetime
    so_luong_hien_tai: Optional[int] = None
    so_luong_da_su_dung: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# Pydantic Schemas - Gift Box Batch
# =========================================================
class GiftBoxBatchCreate(BatchDateValidationMixin):
    hop_qua_id: int = Field(..., gt=0)
    ncc_id: Optional[int] = Field(None, gt=0)
    ma_lo: str = Field(..., min_length=1, max_length=50)
    ngay_het_han: datetime
    so_luong: int = Field(..., gt=0)
    gia_don_vi: Decimal = Field(..., gt=0)
    trang_thai: str = Field(default="hoatdong", pattern="^(hoatdong|tamdung|hethan|daxuathet)$")
    ma_qr: Optional[str] = Field(None, max_length=100)
    ghi_chu: Optional[str] = None


class GiftBoxBatchUpdate(BatchUpdateDateValidationMixin):
    ncc_id: Optional[int] = Field(None, gt=0)
    ngay_het_han: Optional[datetime] = None
    so_luong: Optional[int] = Field(None, gt=0)
    gia_don_vi: Optional[Decimal] = Field(None, gt=0)
    trang_thai: Optional[str] = Field(None, pattern="^(hoatdong|tamdung|hethan|daxuathet)$")
    ma_qr: Optional[str] = Field(None, max_length=100)
    ghi_chu: Optional[str] = None


class GiftBoxBatchResponse(BaseModel):
    lohang_id: int
    hop_qua_id: int
    ncc_id: Optional[int]
    ma_lo: str
    ngay_nhap: datetime
    ngay_het_han: datetime
    so_luong: int
    gia_don_vi: float
    trang_thai: str
    ma_qr: Optional[str]
    ghi_chu: Optional[str]
    ngay_tao: datetime
    so_luong_hien_tai: Optional[int] = None
    so_luong_da_ban: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# Product Batch Endpoints
# =========================================================
@router.post("/products", response_model=ProductBatchResponse, status_code=status.HTTP_201_CREATED)
def create_product_batch(
    batch_data: ProductBatchCreate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("batches.write"))
):
    """Tạo lô hàng sản phẩm mới"""
    try:
        return batch_service.create_batch(db, "products", batch_data, current_user)
    except DomainError as exc:
        _raise_http(exc)


@router.get("/products", response_model=Page[ProductBatchResponse])
def list_product_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    sort_by: BatchSortField = Query(BatchSortField.ngay_het_han),
    sort_dir: Literal["asc", "desc"] = Query("asc"),
    bienthe_id: Optional[int] = Query(None, gt=0),
    ncc_id: Optional[int] = Query(None, gt=0),
    trang_thai: Optional[str] = Query(None, pattern="^(hoatdong|tamdung|hethan|daxuathet)$"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo mã lô hoặc mã QR"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("inventory.read"))
):
    """Danh sách lô hàng sản phẩm"""
    return batch_service.list_batches(
        db, "products", skip=skip, limit=limit, item_id=bienthe_id,
        ncc_id=ncc_id, trang_thai=trang_thai, search=search,
        sort_by=sort_by.value, sort_dir=sort_dir,
    )


@router.get("/products/{batch_id}", response_model=ProductBatchResponse)
def get_product_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("inventory.read"))
):
    """Chi tiết lô hàng sản phẩm"""
    try:
        return batch_service.get_batch(db, "products", batch_id)
    except DomainError as exc:
        _raise_http(exc)


@router.put("/products/{batch_id}", response_model=ProductBatchResponse)
def update_product_batch(
    batch_id: int,
    batch_data: ProductBatchUpdate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("batches.write"))
):
    """Cập nhật lô hàng sản phẩm"""
    try:
        return batch_service.update_batch(db, "products", batch_id, batch_data)
    except DomainError as exc:
        _raise_http(exc)


# =========================================================
# Component Batch Endpoints
# =========================================================
@router.post("/components", response_model=ComponentBatchResponse, status_code=status.HTTP_201_CREATED)
def create_component_batch(
    batch_data: ComponentBatchCreate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("batches.write"))
):
    """Tạo lô hàng linh kiện mới"""
    try:
        return batch_service.create_batch(db, "components", batch_data, current_user)
    except DomainError as exc:
        _raise_http(exc)


@router.get("/components", response_model=Page[ComponentBatchResponse])
def list_component_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    sort_by: BatchSortField = Query(BatchSortField.ngay_het_han),
    sort_dir: Literal["asc", "desc"] = Query("asc"),
    linh_kien_id: Optional[int] = Query(None, gt=0),
    ncc_id: Optional[int] = Query(None, gt=0),
    trang_thai: Optional[str] = Query(None, pattern="^(hoatdong|tamdung|hethan|daxuathet)$"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("inventory.read"))
):
    """Danh sách lô hàng linh kiện"""
    return batch_service.list_batches(
        db, "components", skip=skip, limit=limit, item_id=linh_kien_id,
        ncc_id=ncc_id, trang_thai=trang_thai, search=search,
        sort_by=sort_by.value, sort_dir=sort_dir,
    )


@router.get("/components/{batch_id}", response_model=ComponentBatchResponse)
def get_component_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("inventory.read"))
):
    """Chi tiết lô hàng linh kiện"""
    try:
        return batch_service.get_batch(db, "components", batch_id)
    except DomainError as exc:
        _raise_http(exc)


@router.put("/components/{batch_id}", response_model=ComponentBatchResponse)
def update_component_batch(
    batch_id: int,
    batch_data: ComponentBatchUpdate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("batches.write"))
):
    """Cập nhật lô hàng linh kiện"""
    try:
        return batch_service.update_batch(db, "components", batch_id, batch_data)
    except DomainError as exc:
        _raise_http(exc)


# =========================================================
# Gift Box Batch Endpoints
# =========================================================
@router.post("/gift-boxes", response_model=GiftBoxBatchResponse, status_code=status.HTTP_201_CREATED)
def create_gift_box_batch(
    batch_data: GiftBoxBatchCreate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("batches.write"))
):
    """Tạo lô hàng hộp quà mới"""
    try:
        return batch_service.create_batch(db, "gift_boxes", batch_data, current_user)
    except DomainError as exc:
        _raise_http(exc)


@router.get("/gift-boxes", response_model=Page[GiftBoxBatchResponse])
def list_gift_box_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    sort_by: BatchSortField = Query(BatchSortField.ngay_het_han),
    sort_dir: Literal["asc", "desc"] = Query("asc"),
    hop_qua_id: Optional[int] = Query(None, gt=0),
    ncc_id: Optional[int] = Query(None, gt=0),
    trang_thai: Optional[str] = Query(None, pattern="^(hoatdong|tamdung|hethan|daxuathet)$"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("inventory.read"))
):
    """Danh sách lô hàng hộp quà"""
    return batch_service.list_batches(
        db, "gift_boxes", skip=skip, limit=limit, item_id=hop_qua_id,
        ncc_id=ncc_id, trang_thai=trang_thai, search=search,
        sort_by=sort_by.value, sort_dir=sort_dir,
    )


@router.get("/gift-boxes/{batch_id}", response_model=GiftBoxBatchResponse)
def get_gift_box_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("inventory.read"))
):
    """Chi tiết lô hàng hộp quà"""
    try:
        return batch_service.get_batch(db, "gift_boxes", batch_id)
    except DomainError as exc:
        _raise_http(exc)


@router.put("/gift-boxes/{batch_id}", response_model=GiftBoxBatchResponse)
def update_gift_box_batch(
    batch_id: int,
    batch_data: GiftBoxBatchUpdate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("batches.write"))
):
    """Cập nhật lô hàng hộp quà"""
    try:
        return batch_service.update_batch(db, "gift_boxes", batch_id, batch_data)
    except DomainError as exc:
        _raise_http(exc)


# =========================================================
# Expiring Batches Warning
# =========================================================
@router.get("/expiring")
def get_expiring_batches(
    days: int = Query(7, ge=1, le=30, description="Số ngày trước khi hết hạn"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("inventory.read"))
):
    """Cảnh báo các lô hàng sắp hết hạn"""
    return batch_service.get_expiring_batches(db, days)


# =========================================================
# Inventory Endpoints
# =========================================================
@router.get("/inventory/products")
def get_product_inventory(
    bienthe_id: Optional[int] = Query(None, gt=0),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("inventory.read"))
):
    """Tồn kho sản phẩm"""
    return batch_service.get_product_inventory(db, bienthe_id)


@router.get("/inventory/components")
def get_component_inventory(
    linh_kien_id: Optional[int] = Query(None, gt=0),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("inventory.read"))
):
    """Tồn kho linh kiện"""
    return batch_service.get_component_inventory(db, linh_kien_id)


@router.get("/inventory/gift-boxes")
def get_gift_box_inventory(
    hop_qua_id: Optional[int] = Query(None, gt=0),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("inventory.read"))
):
    """Tồn kho hộp quà"""
    return batch_service.get_gift_box_inventory(db, hop_qua_id)


# =========================================================
# Backward compatibility endpoint
# =========================================================
@router.get("/by-variant/{bienthe_id}")
def batches_by_variant(
    bienthe_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("inventory.read"))
):
    """Danh sách lô hàng theo biến thể (backward compatibility)"""
    return batch_service.batches_by_variant(db, bienthe_id)
