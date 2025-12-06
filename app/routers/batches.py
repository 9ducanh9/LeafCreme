"""
Batches Router: CRUD operations cho lô hàng và tồn kho
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
from decimal import Decimal
from datetime import datetime, timedelta

from ..db import get_db
from ..models import (
    LoHangSanPham, LoHangLinhKien, LoHangHopQua,
    TonKhoSanPham, TonKhoLinhKien, TonKhoHopQua,
    BienTheSanPham, SanPham, LinhKien, HopQua, NhaCungCap
)
from ..core.dependencies import get_current_active_user, require_role
from ..models import NguoiDung
from pydantic import BaseModel, Field

router = APIRouter(prefix="/batches", tags=["batches"])


# =========================================================
# Pydantic Schemas - Product Batch
# =========================================================
class ProductBatchCreate(BaseModel):
    bienthe_sanpham_id: int = Field(..., gt=0)
    ncc_id: Optional[int] = Field(None, gt=0)
    ma_lo: str = Field(..., min_length=1, max_length=50)
    ngay_het_han: datetime
    so_luong: int = Field(..., gt=0)
    gia_don_vi: Decimal = Field(..., gt=0, decimal_places=2)
    trang_thai: str = Field(default="hoatdong", pattern="^(hoatdong|hethan|huy)$")
    ma_qr: Optional[str] = Field(None, max_length=100)
    ghi_chu: Optional[str] = None


class ProductBatchUpdate(BaseModel):
    ncc_id: Optional[int] = Field(None, gt=0)
    ngay_het_han: Optional[datetime] = None
    so_luong: Optional[int] = Field(None, gt=0)
    gia_don_vi: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    trang_thai: Optional[str] = Field(None, pattern="^(hoatdong|hethan|huy)$")
    ma_qr: Optional[str] = Field(None, max_length=100)
    ghi_chu: Optional[str] = None


class ProductBatchResponse(BaseModel):
    lohang_id: int
    bienthe_sanpham_id: int
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

    class Config:
        from_attributes = True


# =========================================================
# Pydantic Schemas - Component Batch
# =========================================================
class ComponentBatchCreate(BaseModel):
    linh_kien_id: int = Field(..., gt=0)
    ncc_id: Optional[int] = Field(None, gt=0)
    ma_lo: str = Field(..., min_length=1, max_length=50)
    ngay_het_han: datetime
    so_luong: int = Field(..., gt=0)
    gia_don_vi: Decimal = Field(..., gt=0, decimal_places=2)
    trang_thai: str = Field(default="hoatdong", pattern="^(hoatdong|hethan|huy)$")
    ma_qr: Optional[str] = Field(None, max_length=100)
    ghi_chu: Optional[str] = None


class ComponentBatchUpdate(BaseModel):
    ncc_id: Optional[int] = Field(None, gt=0)
    ngay_het_han: Optional[datetime] = None
    so_luong: Optional[int] = Field(None, gt=0)
    gia_don_vi: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    trang_thai: Optional[str] = Field(None, pattern="^(hoatdong|hethan|huy)$")
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

    class Config:
        from_attributes = True


# =========================================================
# Pydantic Schemas - Gift Box Batch
# =========================================================
class GiftBoxBatchCreate(BaseModel):
    hop_qua_id: int = Field(..., gt=0)
    ncc_id: Optional[int] = Field(None, gt=0)
    ma_lo: str = Field(..., min_length=1, max_length=50)
    ngay_het_han: datetime
    so_luong: int = Field(..., gt=0)
    gia_don_vi: Decimal = Field(..., gt=0, decimal_places=2)
    trang_thai: str = Field(default="hoatdong", pattern="^(hoatdong|hethan|huy)$")
    ma_qr: Optional[str] = Field(None, max_length=100)
    ghi_chu: Optional[str] = None


class GiftBoxBatchUpdate(BaseModel):
    ncc_id: Optional[int] = Field(None, gt=0)
    ngay_het_han: Optional[datetime] = None
    so_luong: Optional[int] = Field(None, gt=0)
    gia_don_vi: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    trang_thai: Optional[str] = Field(None, pattern="^(hoatdong|hethan|huy)$")
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

    class Config:
        from_attributes = True


# =========================================================
# Product Batch Endpoints
# =========================================================
@router.post("/products", response_model=ProductBatchResponse, status_code=status.HTTP_201_CREATED)
def create_product_batch(
    batch_data: ProductBatchCreate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff"))
):
    """Tạo lô hàng sản phẩm mới"""
    # Kiểm tra biến thể tồn tại
    variant = db.query(BienTheSanPham).filter(
        BienTheSanPham.bienthe_id == batch_data.bienthe_sanpham_id
    ).first()
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Biến thể sản phẩm với ID {batch_data.bienthe_sanpham_id} không tồn tại"
        )
    
    # Kiểm tra nhà cung cấp nếu có
    if batch_data.ncc_id:
        supplier = db.query(NhaCungCap).filter(NhaCungCap.ncc_id == batch_data.ncc_id).first()
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Nhà cung cấp với ID {batch_data.ncc_id} không tồn tại"
            )
    
    # Kiểm tra mã lô trùng
    existing = db.query(LoHangSanPham).filter(LoHangSanPham.ma_lo == batch_data.ma_lo).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã lô '{batch_data.ma_lo}' đã tồn tại"
        )
    
    # Kiểm tra mã QR trùng nếu có
    if batch_data.ma_qr:
        existing_qr = db.query(LoHangSanPham).filter(LoHangSanPham.ma_qr == batch_data.ma_qr).first()
        if existing_qr:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã QR '{batch_data.ma_qr}' đã tồn tại"
            )
    
    # Validate ngày hết hạn > ngày nhập
    if batch_data.ngay_het_han <= datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày hết hạn phải sau ngày nhập"
        )
    
    # Tạo lô hàng
    batch = LoHangSanPham(**batch_data.model_dump())
    db.add(batch)
    db.flush()
    
    # Tạo tồn kho tự động
    inventory = TonKhoSanPham(
        lohang_sanpham_id=batch.lohang_id,
        so_luong_hien_tai=batch.so_luong,
        so_luong_da_ban=0
    )
    db.add(inventory)
    db.commit()
    db.refresh(batch)
    
    # Lấy thông tin tồn kho để response
    result = ProductBatchResponse.model_validate(batch)
    result.so_luong_hien_tai = inventory.so_luong_hien_tai
    result.so_luong_da_ban = inventory.so_luong_da_ban
    return result


@router.get("/products", response_model=List[ProductBatchResponse])
def list_product_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    bienthe_id: Optional[int] = Query(None, gt=0),
    ncc_id: Optional[int] = Query(None, gt=0),
    trang_thai: Optional[str] = Query(None, pattern="^(hoatdong|hethan|huy)$"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo mã lô hoặc mã QR"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_active_user)
):
    """Danh sách lô hàng sản phẩm"""
    query = db.query(LoHangSanPham)
    
    if bienthe_id:
        query = query.filter(LoHangSanPham.bienthe_sanpham_id == bienthe_id)
    
    if ncc_id:
        query = query.filter(LoHangSanPham.ncc_id == ncc_id)
    
    if trang_thai:
        query = query.filter(LoHangSanPham.trang_thai == trang_thai)
    
    if search:
        conditions = [LoHangSanPham.ma_lo.ilike(f"%{search}%")]
        # Chỉ thêm điều kiện ma_qr nếu cột có thể null và search khớp
        conditions.append(LoHangSanPham.ma_qr.ilike(f"%{search}%"))
        query = query.filter(or_(*conditions))
    
    batches = query.order_by(LoHangSanPham.ngay_het_han.asc()).offset(skip).limit(limit).all()
    
    # Lấy tồn kho tương ứng
    result = []
    for batch in batches:
        inv = db.query(TonKhoSanPham).filter(
            TonKhoSanPham.lohang_sanpham_id == batch.lohang_id
        ).first()
        item = ProductBatchResponse.model_validate(batch)
        if inv:
            item.so_luong_hien_tai = inv.so_luong_hien_tai
            item.so_luong_da_ban = inv.so_luong_da_ban
        result.append(item)
    
    return result


@router.get("/products/{batch_id}", response_model=ProductBatchResponse)
def get_product_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_active_user)
):
    """Chi tiết lô hàng sản phẩm"""
    batch = db.query(LoHangSanPham).filter(LoHangSanPham.lohang_id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lô hàng với ID {batch_id} không tồn tại"
        )
    
    inv = db.query(TonKhoSanPham).filter(
        TonKhoSanPham.lohang_sanpham_id == batch.lohang_id
    ).first()
    
    result = ProductBatchResponse.model_validate(batch)
    if inv:
        result.so_luong_hien_tai = inv.so_luong_hien_tai
        result.so_luong_da_ban = inv.so_luong_da_ban
    return result


@router.put("/products/{batch_id}", response_model=ProductBatchResponse)
def update_product_batch(
    batch_id: int,
    batch_data: ProductBatchUpdate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff"))
):
    """Cập nhật lô hàng sản phẩm"""
    batch = db.query(LoHangSanPham).filter(LoHangSanPham.lohang_id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lô hàng với ID {batch_id} không tồn tại"
        )
    
    update_data = batch_data.model_dump(exclude_unset=True)
    
    # Kiểm tra mã QR trùng nếu có thay đổi
    if "ma_qr" in update_data and update_data["ma_qr"]:
        if update_data["ma_qr"] != batch.ma_qr:
            existing = db.query(LoHangSanPham).filter(
                LoHangSanPham.ma_qr == update_data["ma_qr"],
                LoHangSanPham.lohang_id != batch_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mã QR '{update_data['ma_qr']}' đã tồn tại"
                )
    
    # Validate ngày hết hạn
    ngay_het_han = update_data.get("ngay_het_han", batch.ngay_het_han)
    if ngay_het_han <= batch.ngay_nhap:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày hết hạn phải sau ngày nhập"
        )
    
    for field, value in update_data.items():
        setattr(batch, field, value)
    
    db.commit()
    db.refresh(batch)
    
    inv = db.query(TonKhoSanPham).filter(
        TonKhoSanPham.lohang_sanpham_id == batch.lohang_id
    ).first()
    
    result = ProductBatchResponse.model_validate(batch)
    if inv:
        result.so_luong_hien_tai = inv.so_luong_hien_tai
        result.so_luong_da_ban = inv.so_luong_da_ban
    return result


# =========================================================
# Component Batch Endpoints
# =========================================================
@router.post("/components", response_model=ComponentBatchResponse, status_code=status.HTTP_201_CREATED)
def create_component_batch(
    batch_data: ComponentBatchCreate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff"))
):
    """Tạo lô hàng linh kiện mới"""
    # Kiểm tra linh kiện tồn tại
    component = db.query(LinhKien).filter(LinhKien.linh_kien_id == batch_data.linh_kien_id).first()
    if not component:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Linh kiện với ID {batch_data.linh_kien_id} không tồn tại"
        )
    
    # Kiểm tra nhà cung cấp nếu có
    if batch_data.ncc_id:
        supplier = db.query(NhaCungCap).filter(NhaCungCap.ncc_id == batch_data.ncc_id).first()
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Nhà cung cấp với ID {batch_data.ncc_id} không tồn tại"
            )
    
    # Kiểm tra mã lô trùng
    existing = db.query(LoHangLinhKien).filter(LoHangLinhKien.ma_lo == batch_data.ma_lo).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã lô '{batch_data.ma_lo}' đã tồn tại"
        )
    
    # Validate ngày hết hạn
    if batch_data.ngay_het_han <= datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày hết hạn phải sau ngày nhập"
        )
    
    batch = LoHangLinhKien(**batch_data.model_dump())
    db.add(batch)
    db.flush()
    
    # Tạo tồn kho tự động
    inventory = TonKhoLinhKien(
        lohang_linhkien_id=batch.lohang_id,
        so_luong_hien_tai=batch.so_luong,
        so_luong_da_su_dung=0
    )
    db.add(inventory)
    db.commit()
    db.refresh(batch)
    
    result = ComponentBatchResponse.model_validate(batch)
    result.so_luong_hien_tai = inventory.so_luong_hien_tai
    result.so_luong_da_su_dung = inventory.so_luong_da_su_dung
    return result


@router.get("/components", response_model=List[ComponentBatchResponse])
def list_component_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    linh_kien_id: Optional[int] = Query(None, gt=0),
    ncc_id: Optional[int] = Query(None, gt=0),
    trang_thai: Optional[str] = Query(None, pattern="^(hoatdong|hethan|huy)$"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_active_user)
):
    """Danh sách lô hàng linh kiện"""
    query = db.query(LoHangLinhKien)
    
    if linh_kien_id:
        query = query.filter(LoHangLinhKien.linh_kien_id == linh_kien_id)
    
    if ncc_id:
        query = query.filter(LoHangLinhKien.ncc_id == ncc_id)
    
    if trang_thai:
        query = query.filter(LoHangLinhKien.trang_thai == trang_thai)
    
    if search:
        query = query.filter(LoHangLinhKien.ma_lo.ilike(f"%{search}%"))
    
    batches = query.order_by(LoHangLinhKien.ngay_het_han.asc()).offset(skip).limit(limit).all()
    
    result = []
    for batch in batches:
        inv = db.query(TonKhoLinhKien).filter(
            TonKhoLinhKien.lohang_linhkien_id == batch.lohang_id
        ).first()
        item = ComponentBatchResponse.model_validate(batch)
        if inv:
            item.so_luong_hien_tai = inv.so_luong_hien_tai
            item.so_luong_da_su_dung = inv.so_luong_da_su_dung
        result.append(item)
    
    return result


@router.get("/components/{batch_id}", response_model=ComponentBatchResponse)
def get_component_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_active_user)
):
    """Chi tiết lô hàng linh kiện"""
    batch = db.query(LoHangLinhKien).filter(LoHangLinhKien.lohang_id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lô hàng với ID {batch_id} không tồn tại"
        )
    
    inv = db.query(TonKhoLinhKien).filter(
        TonKhoLinhKien.lohang_linhkien_id == batch.lohang_id
    ).first()
    
    result = ComponentBatchResponse.model_validate(batch)
    if inv:
        result.so_luong_hien_tai = inv.so_luong_hien_tai
        result.so_luong_da_su_dung = inv.so_luong_da_su_dung
    return result


@router.put("/components/{batch_id}", response_model=ComponentBatchResponse)
def update_component_batch(
    batch_id: int,
    batch_data: ComponentBatchUpdate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff"))
):
    """Cập nhật lô hàng linh kiện"""
    batch = db.query(LoHangLinhKien).filter(LoHangLinhKien.lohang_id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lô hàng với ID {batch_id} không tồn tại"
        )
    
    update_data = batch_data.model_dump(exclude_unset=True)
    
    ngay_het_han = update_data.get("ngay_het_han", batch.ngay_het_han)
    if ngay_het_han <= batch.ngay_nhap:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày hết hạn phải sau ngày nhập"
        )
    
    for field, value in update_data.items():
        setattr(batch, field, value)
    
    db.commit()
    db.refresh(batch)
    
    inv = db.query(TonKhoLinhKien).filter(
        TonKhoLinhKien.lohang_linhkien_id == batch.lohang_id
    ).first()
    
    result = ComponentBatchResponse.model_validate(batch)
    if inv:
        result.so_luong_hien_tai = inv.so_luong_hien_tai
        result.so_luong_da_su_dung = inv.so_luong_da_su_dung
    return result


# =========================================================
# Gift Box Batch Endpoints
# =========================================================
@router.post("/gift-boxes", response_model=GiftBoxBatchResponse, status_code=status.HTTP_201_CREATED)
def create_gift_box_batch(
    batch_data: GiftBoxBatchCreate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff"))
):
    """Tạo lô hàng hộp quà mới"""
    gift_box = db.query(HopQua).filter(HopQua.hop_qua_id == batch_data.hop_qua_id).first()
    if not gift_box:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hộp quà với ID {batch_data.hop_qua_id} không tồn tại"
        )
    
    if batch_data.ncc_id:
        supplier = db.query(NhaCungCap).filter(NhaCungCap.ncc_id == batch_data.ncc_id).first()
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Nhà cung cấp với ID {batch_data.ncc_id} không tồn tại"
            )
    
    existing = db.query(LoHangHopQua).filter(LoHangHopQua.ma_lo == batch_data.ma_lo).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã lô '{batch_data.ma_lo}' đã tồn tại"
        )
    
    if batch_data.ngay_het_han <= datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày hết hạn phải sau ngày nhập"
        )
    
    batch = LoHangHopQua(**batch_data.model_dump())
    db.add(batch)
    db.flush()
    
    inventory = TonKhoHopQua(
        lohang_hopqua_id=batch.lohang_id,
        so_luong_hien_tai=batch.so_luong,
        so_luong_da_ban=0
    )
    db.add(inventory)
    db.commit()
    db.refresh(batch)
    
    result = GiftBoxBatchResponse.model_validate(batch)
    result.so_luong_hien_tai = inventory.so_luong_hien_tai
    result.so_luong_da_ban = inventory.so_luong_da_ban
    return result


@router.get("/gift-boxes", response_model=List[GiftBoxBatchResponse])
def list_gift_box_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    hop_qua_id: Optional[int] = Query(None, gt=0),
    ncc_id: Optional[int] = Query(None, gt=0),
    trang_thai: Optional[str] = Query(None, pattern="^(hoatdong|hethan|huy)$"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_active_user)
):
    """Danh sách lô hàng hộp quà"""
    query = db.query(LoHangHopQua)
    
    if hop_qua_id:
        query = query.filter(LoHangHopQua.hop_qua_id == hop_qua_id)
    
    if ncc_id:
        query = query.filter(LoHangHopQua.ncc_id == ncc_id)
    
    if trang_thai:
        query = query.filter(LoHangHopQua.trang_thai == trang_thai)
    
    if search:
        query = query.filter(LoHangHopQua.ma_lo.ilike(f"%{search}%"))
    
    batches = query.order_by(LoHangHopQua.ngay_het_han.asc()).offset(skip).limit(limit).all()
    
    result = []
    for batch in batches:
        inv = db.query(TonKhoHopQua).filter(
            TonKhoHopQua.lohang_hopqua_id == batch.lohang_id
        ).first()
        item = GiftBoxBatchResponse.model_validate(batch)
        if inv:
            item.so_luong_hien_tai = inv.so_luong_hien_tai
            item.so_luong_da_ban = inv.so_luong_da_ban
        result.append(item)
    
    return result


@router.get("/gift-boxes/{batch_id}", response_model=GiftBoxBatchResponse)
def get_gift_box_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_active_user)
):
    """Chi tiết lô hàng hộp quà"""
    batch = db.query(LoHangHopQua).filter(LoHangHopQua.lohang_id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lô hàng với ID {batch_id} không tồn tại"
        )
    
    inv = db.query(TonKhoHopQua).filter(
        TonKhoHopQua.lohang_hopqua_id == batch.lohang_id
    ).first()
    
    result = GiftBoxBatchResponse.model_validate(batch)
    if inv:
        result.so_luong_hien_tai = inv.so_luong_hien_tai
        result.so_luong_da_ban = inv.so_luong_da_ban
    return result


@router.put("/gift-boxes/{batch_id}", response_model=GiftBoxBatchResponse)
def update_gift_box_batch(
    batch_id: int,
    batch_data: GiftBoxBatchUpdate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_role("admin", "manager", "staff"))
):
    """Cập nhật lô hàng hộp quà"""
    batch = db.query(LoHangHopQua).filter(LoHangHopQua.lohang_id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lô hàng với ID {batch_id} không tồn tại"
        )
    
    update_data = batch_data.model_dump(exclude_unset=True)
    
    ngay_het_han = update_data.get("ngay_het_han", batch.ngay_het_han)
    if ngay_het_han <= batch.ngay_nhap:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày hết hạn phải sau ngày nhập"
        )
    
    for field, value in update_data.items():
        setattr(batch, field, value)
    
    db.commit()
    db.refresh(batch)
    
    inv = db.query(TonKhoHopQua).filter(
        TonKhoHopQua.lohang_hopqua_id == batch.lohang_id
    ).first()
    
    result = GiftBoxBatchResponse.model_validate(batch)
    if inv:
        result.so_luong_hien_tai = inv.so_luong_hien_tai
        result.so_luong_da_ban = inv.so_luong_da_ban
    return result


# =========================================================
# Expiring Batches Warning
# =========================================================
@router.get("/expiring")
def get_expiring_batches(
    days: int = Query(7, ge=1, le=30, description="Số ngày trước khi hết hạn"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_active_user)
):
    """Cảnh báo các lô hàng sắp hết hạn"""
    cutoff_date = datetime.now() + timedelta(days=days)
    
    # Lô hàng sản phẩm
    from ..models import SanPham as SanPhamModel
    product_batches = db.query(LoHangSanPham, TonKhoSanPham, BienTheSanPham, SanPhamModel).join(
        TonKhoSanPham, TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id
    ).join(
        BienTheSanPham, BienTheSanPham.bienthe_id == LoHangSanPham.bienthe_sanpham_id
    ).join(
        SanPhamModel, SanPhamModel.sanpham_id == BienTheSanPham.sanpham_id
    ).filter(
        and_(
            LoHangSanPham.ngay_het_han <= cutoff_date,
            LoHangSanPham.ngay_het_han > datetime.now(),
            LoHangSanPham.trang_thai == "hoatdong",
            TonKhoSanPham.so_luong_hien_tai > 0
        )
    ).order_by(LoHangSanPham.ngay_het_han.asc()).all()
    
    # Lô hàng linh kiện
    component_batches = db.query(LoHangLinhKien, TonKhoLinhKien, LinhKien).join(
        TonKhoLinhKien, TonKhoLinhKien.lohang_linhkien_id == LoHangLinhKien.lohang_id
    ).join(
        LinhKien, LinhKien.linh_kien_id == LoHangLinhKien.linh_kien_id
    ).filter(
        and_(
            LoHangLinhKien.ngay_het_han <= cutoff_date,
            LoHangLinhKien.ngay_het_han > datetime.now(),
            LoHangLinhKien.trang_thai == "hoatdong",
            TonKhoLinhKien.so_luong_hien_tai > 0
        )
    ).order_by(LoHangLinhKien.ngay_het_han.asc()).all()
    
    # Lô hàng hộp quà
    gift_box_batches = db.query(LoHangHopQua, TonKhoHopQua, HopQua).join(
        TonKhoHopQua, TonKhoHopQua.lohang_hopqua_id == LoHangHopQua.lohang_id
    ).join(
        HopQua, HopQua.hop_qua_id == LoHangHopQua.hop_qua_id
    ).filter(
        and_(
            LoHangHopQua.ngay_het_han <= cutoff_date,
            LoHangHopQua.ngay_het_han > datetime.now(),
            LoHangHopQua.trang_thai == "hoatdong",
            TonKhoHopQua.so_luong_hien_tai > 0
        )
    ).order_by(LoHangHopQua.ngay_het_han.asc()).all()
    
    return {
        "products": [
            {
                "lohang_id": lo.lohang_id,
                "ma_lo": lo.ma_lo,
                "ngay_het_han": lo.ngay_het_han,
                "so_luong_hien_tai": tk.so_luong_hien_tai,
                "ten": f"{sp.ten} - {bv.huong_vi}"
            }
            for lo, tk, bv, sp in product_batches
        ],
        "components": [
            {
                "lohang_id": lo.lohang_id,
                "ma_lo": lo.ma_lo,
                "ngay_het_han": lo.ngay_het_han,
                "so_luong_hien_tai": tk.so_luong_hien_tai,
                "ten": lk.ten_linh_kien
            }
            for lo, tk, lk in component_batches
        ],
        "gift_boxes": [
            {
                "lohang_id": lo.lohang_id,
                "ma_lo": lo.ma_lo,
                "ngay_het_han": lo.ngay_het_han,
                "so_luong_hien_tai": tk.so_luong_hien_tai,
                "ten": hq.ten_hop_qua
            }
            for lo, tk, hq in gift_box_batches
        ]
    }


# =========================================================
# Inventory Endpoints
# =========================================================
@router.get("/inventory/products")
def get_product_inventory(
    bienthe_id: Optional[int] = Query(None, gt=0),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_active_user)
):
    """Tồn kho sản phẩm"""
    query = db.query(TonKhoSanPham, LoHangSanPham, BienTheSanPham, SanPham).join(
        LoHangSanPham, LoHangSanPham.lohang_id == TonKhoSanPham.lohang_sanpham_id
    ).join(
        BienTheSanPham, BienTheSanPham.bienthe_id == LoHangSanPham.bienthe_sanpham_id
    ).join(
        SanPham, SanPham.sanpham_id == BienTheSanPham.sanpham_id
    ).filter(
        LoHangSanPham.trang_thai == "hoatdong"
    )
    
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
            "ngay_het_han": lo.ngay_het_han
        }
        for tk, lo, bv, sp in results
    ]


@router.get("/inventory/components")
def get_component_inventory(
    linh_kien_id: Optional[int] = Query(None, gt=0),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_active_user)
):
    """Tồn kho linh kiện"""
    query = db.query(TonKhoLinhKien, LoHangLinhKien, LinhKien).join(
        LoHangLinhKien, LoHangLinhKien.lohang_id == TonKhoLinhKien.lohang_linhkien_id
    ).join(
        LinhKien, LinhKien.linh_kien_id == LoHangLinhKien.linh_kien_id
    ).filter(
        LoHangLinhKien.trang_thai == "hoatdong"
    )
    
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
            "ngay_het_han": lo.ngay_het_han
        }
        for tk, lo, lk in results
    ]


@router.get("/inventory/gift-boxes")
def get_gift_box_inventory(
    hop_qua_id: Optional[int] = Query(None, gt=0),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_active_user)
):
    """Tồn kho hộp quà"""
    query = db.query(TonKhoHopQua, LoHangHopQua, HopQua).join(
        LoHangHopQua, LoHangHopQua.lohang_id == TonKhoHopQua.lohang_hopqua_id
    ).join(
        HopQua, HopQua.hop_qua_id == LoHangHopQua.hop_qua_id
    ).filter(
        LoHangHopQua.trang_thai == "hoatdong"
    )
    
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
            "ngay_het_han": lo.ngay_het_han
        }
        for tk, lo, hq in results
    ]


# =========================================================
# Backward compatibility endpoint
# =========================================================
@router.get("/by-variant/{bienthe_id}")
def batches_by_variant(
    bienthe_id: int,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(get_current_active_user)
):
    """Danh sách lô hàng theo biến thể (backward compatibility)"""
    rows = (
        db.query(LoHangSanPham, TonKhoSanPham)
        .join(TonKhoSanPham, TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id)
        .filter(
            LoHangSanPham.bienthe_sanpham_id == bienthe_id,
            TonKhoSanPham.so_luong_hien_tai > 0
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
