"""
Suppliers router: Quản lý nhà cung cấp
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr

from app.db import get_db
from app.models import NhaCungCap
from app.core.dependencies import get_current_user, require_role
from app.schemas import ThongTinThanhToan, validate_thong_tin_thanh_toan

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


# =========================================================
# Request/Response Schemas
# =========================================================
class SupplierCreate(BaseModel):
    """Tạo nhà cung cấp mới"""
    ten_ncc: str = Field(..., min_length=1, max_length=200, description="Tên nhà cung cấp")
    ma_ncc: Optional[str] = Field(None, max_length=50, description="Mã nhà cung cấp (unique)")
    nguoi_lien_he: Optional[str] = Field(None, max_length=100)
    so_dien_thoai: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = Field(None, max_length=100)
    dia_chi: Optional[str] = None
    thong_tin_thanh_toan: Optional[ThongTinThanhToan] = Field(
        None, 
        description="Thông tin thanh toán (tên ngân hàng, số tài khoản, etc.)"
    )
    ghi_chu: Optional[str] = None
    dang_hoat_dong: bool = Field(True, description="Trạng thái hoạt động")


class SupplierUpdate(BaseModel):
    """Cập nhật nhà cung cấp"""
    ten_ncc: Optional[str] = Field(None, min_length=1, max_length=200)
    ma_ncc: Optional[str] = Field(None, max_length=50)
    nguoi_lien_he: Optional[str] = Field(None, max_length=100)
    so_dien_thoai: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = Field(None, max_length=100)
    dia_chi: Optional[str] = None
    thong_tin_thanh_toan: Optional[ThongTinThanhToan] = None
    ghi_chu: Optional[str] = None
    dang_hoat_dong: Optional[bool] = None


class SupplierResponse(BaseModel):
    """Thông tin nhà cung cấp"""
    ncc_id: int
    ten_ncc: str
    ma_ncc: Optional[str] = None
    nguoi_lien_he: Optional[str] = None
    so_dien_thoai: Optional[str] = None
    email: Optional[str] = None
    dia_chi: Optional[str] = None
    thong_tin_thanh_toan: Optional[dict] = None
    ghi_chu: Optional[str] = None
    dang_hoat_dong: bool
    ngay_tao: datetime
    
    class Config:
        from_attributes = True


# =========================================================
# Endpoints
# =========================================================
@router.get("", response_model=List[SupplierResponse])
def list_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên, mã, email, số điện thoại"),
    dang_hoat_dong: Optional[bool] = Query(None, description="Filter theo trạng thái hoạt động"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Danh sách nhà cung cấp với filter và pagination"""
    query = db.query(NhaCungCap)
    
    # Filter theo trạng thái
    if dang_hoat_dong is not None:
        query = query.filter(NhaCungCap.dang_hoat_dong == dang_hoat_dong)
    
    # Tìm kiếm
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                NhaCungCap.ten_ncc.ilike(search_term),
                NhaCungCap.ma_ncc.ilike(search_term),
                NhaCungCap.email.ilike(search_term),
                NhaCungCap.so_dien_thoai.ilike(search_term),
                NhaCungCap.nguoi_lien_he.ilike(search_term)
            )
        )
    
    # Sắp xếp theo ngày tạo mới nhất
    suppliers = query.order_by(desc(NhaCungCap.ngay_tao)).offset(skip).limit(limit).all()
    
    return suppliers


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Lấy thông tin chi tiết nhà cung cấp"""
    supplier = db.query(NhaCungCap).filter(NhaCungCap.ncc_id == supplier_id).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nhà cung cấp không tồn tại"
        )
    
    return supplier


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin", "manager"))
):
    """Tạo nhà cung cấp mới (chỉ admin/manager)"""
    # Kiểm tra mã nhà cung cấp unique
    if payload.ma_ncc:
        existing = db.query(NhaCungCap).filter(NhaCungCap.ma_ncc == payload.ma_ncc).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã nhà cung cấp '{payload.ma_ncc}' đã tồn tại"
            )
    
    # Validate và chuẩn hóa thông tin thanh toán
    thong_tin_tt = None
    if payload.thong_tin_thanh_toan:
        try:
            thong_tin_tt = validate_thong_tin_thanh_toan(payload.thong_tin_thanh_toan.model_dump())
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Thông tin thanh toán không hợp lệ: {str(e)}"
            )
    
    # Tạo nhà cung cấp mới
    supplier = NhaCungCap(
        ten_ncc=payload.ten_ncc,
        ma_ncc=payload.ma_ncc,
        nguoi_lien_he=payload.nguoi_lien_he,
        so_dien_thoai=payload.so_dien_thoai,
        email=payload.email,
        dia_chi=payload.dia_chi,
        thong_tin_thanh_toan=thong_tin_tt,
        ghi_chu=payload.ghi_chu,
        dang_hoat_dong=payload.dang_hoat_dong
    )
    
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    
    return supplier


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin", "manager"))
):
    """Cập nhật thông tin nhà cung cấp (chỉ admin/manager)"""
    supplier = db.query(NhaCungCap).filter(NhaCungCap.ncc_id == supplier_id).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nhà cung cấp không tồn tại"
        )
    
    # Kiểm tra mã nhà cung cấp unique (nếu thay đổi)
    if payload.ma_ncc and payload.ma_ncc != supplier.ma_ncc:
        existing = db.query(NhaCungCap).filter(
            NhaCungCap.ma_ncc == payload.ma_ncc,
            NhaCungCap.ncc_id != supplier_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã nhà cung cấp '{payload.ma_ncc}' đã tồn tại"
            )
    
    # Cập nhật các trường
    if payload.ten_ncc is not None:
        supplier.ten_ncc = payload.ten_ncc
    if payload.ma_ncc is not None:
        supplier.ma_ncc = payload.ma_ncc
    if payload.nguoi_lien_he is not None:
        supplier.nguoi_lien_he = payload.nguoi_lien_he
    if payload.so_dien_thoai is not None:
        supplier.so_dien_thoai = payload.so_dien_thoai
    if payload.email is not None:
        supplier.email = payload.email
    if payload.dia_chi is not None:
        supplier.dia_chi = payload.dia_chi
    if payload.ghi_chu is not None:
        supplier.ghi_chu = payload.ghi_chu
    if payload.dang_hoat_dong is not None:
        supplier.dang_hoat_dong = payload.dang_hoat_dong
    
    # Cập nhật thông tin thanh toán
    if payload.thong_tin_thanh_toan is not None:
        try:
            supplier.thong_tin_thanh_toan = validate_thong_tin_thanh_toan(
                payload.thong_tin_thanh_toan.model_dump()
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Thông tin thanh toán không hợp lệ: {str(e)}"
            )
    
    db.commit()
    db.refresh(supplier)
    
    return supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: int,
    hard_delete: bool = Query(False, description="Xóa vĩnh viễn (thay vì vô hiệu hóa)"),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin", "manager"))
):
    """Xóa/vô hiệu hóa nhà cung cấp (chỉ admin/manager)"""
    supplier = db.query(NhaCungCap).filter(NhaCungCap.ncc_id == supplier_id).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nhà cung cấp không tồn tại"
        )
    
    # TODO: Kiểm tra xem nhà cung cấp có đang được sử dụng trong lô hàng không
    # Nếu có, chỉ vô hiệu hóa thay vì xóa
    
    if hard_delete:
        # Xóa vĩnh viễn (nguy hiểm nếu có foreign key constraints)
        db.delete(supplier)
    else:
        # Vô hiệu hóa (soft delete)
        supplier.dang_hoat_dong = False
    
    db.commit()
    
    return None

