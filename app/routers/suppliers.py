"""
Suppliers router: Quản lý nhà cung cấp

Thin by design — see app.services.suppliers.SupplierService for the
business logic (moved out as part of the Phase 1 service-layer migration).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.db import get_db
from app.core.capabilities import require_capability
from app.schemas import ThongTinThanhToan
from app.services.suppliers import SupplierService, DomainError

router = APIRouter(prefix="/suppliers", tags=["suppliers"])
supplier_service = SupplierService()


def _raise_http(exc: DomainError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)


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

    model_config = ConfigDict(from_attributes=True)


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
    current_user = Depends(require_capability("suppliers.read"))
):
    """Danh sách nhà cung cấp với filter và pagination"""
    return supplier_service.list_suppliers(db, skip=skip, limit=limit, search=search, dang_hoat_dong=dang_hoat_dong)


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_capability("suppliers.read"))
):
    """Lấy thông tin chi tiết nhà cung cấp"""
    try:
        return supplier_service.get_supplier(db, supplier_id)
    except DomainError as exc:
        _raise_http(exc)


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_capability("suppliers.write"))
):
    """Tạo nhà cung cấp mới (chỉ admin/manager)"""
    try:
        return supplier_service.create_supplier(db, payload)
    except DomainError as exc:
        _raise_http(exc)


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_capability("suppliers.write"))
):
    """Cập nhật thông tin nhà cung cấp (chỉ admin/manager)"""
    try:
        return supplier_service.update_supplier(db, supplier_id, payload)
    except DomainError as exc:
        _raise_http(exc)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: int,
    hard_delete: bool = Query(False, description="Xóa vĩnh viễn (thay vì vô hiệu hóa)"),
    db: Session = Depends(get_db),
    current_user = Depends(require_capability("suppliers.write"))
):
    """Xóa/vô hiệu hóa nhà cung cấp (chỉ admin/manager)"""
    try:
        supplier_service.delete_supplier(db, supplier_id, hard_delete=hard_delete)
    except DomainError as exc:
        _raise_http(exc)
    return None
