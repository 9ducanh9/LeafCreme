"""
User management router: CRUD operations cho người dùng

Thin by design — see app.services.users.UserService for the business logic
(moved out as part of the Phase 1 service-layer migration).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from app.db import get_db
from app.models import NguoiDung
from app.core.dependencies import get_current_active_user, require_role, get_current_user
from app.services.users import UserService, DomainError
from pydantic import BaseModel, ConfigDict, EmailStr, Field

router = APIRouter(prefix="/users", tags=["users"])
user_service = UserService()


def _raise_http(exc: DomainError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail)


# =========================================================
# Request/Response Schemas
# =========================================================
class UserCreate(BaseModel):
    ten_dang_nhap: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    mat_khau: str = Field(..., min_length=6)
    ho_ten: str = Field(..., min_length=1, max_length=100)
    vaitro_id: int = Field(..., gt=0)
    so_dien_thoai: Optional[str] = Field(None, max_length=20)
    dia_chi: Optional[str] = None
    ngay_sinh: Optional[date] = None
    gioi_tinh: Optional[str] = Field(None, max_length=10)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    ho_ten: Optional[str] = Field(None, min_length=1, max_length=100)
    vaitro_id: Optional[int] = Field(None, gt=0)
    so_dien_thoai: Optional[str] = Field(None, max_length=20)
    dia_chi: Optional[str] = None
    ngay_sinh: Optional[date] = None
    gioi_tinh: Optional[str] = Field(None, max_length=10)
    avatar_url: Optional[str] = None  # Database column name
    dang_hoat_dong: Optional[bool] = None


class UserResponse(BaseModel):
    nguoidung_id: int
    ten_dang_nhap: str
    email: str
    ho_ten: str
    so_dien_thoai: Optional[str]
    dia_chi: Optional[str]
    ngay_sinh: Optional[date]
    gioi_tinh: Optional[str]
    avatar_url: Optional[str]  # Database column name
    dang_hoat_dong: bool
    lan_dang_nhap_cuoi: Optional[str]
    ngay_tao: str
    vaitro: dict

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# Endpoints
# =========================================================
@router.get("", response_model=List[UserResponse])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên, email, username"),
    vaitro_id: Optional[int] = Query(None, description="Lọc theo vai trò"),
    dang_hoat_dong: Optional[bool] = Query(None, description="Lọc theo trạng thái"),
    current_user: NguoiDung = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db)
):
    """Danh sách người dùng (chỉ admin/manager)"""
    return user_service.list_users(
        db, skip=skip, limit=limit, search=search, vaitro_id=vaitro_id, dang_hoat_dong=dang_hoat_dong,
    )


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: NguoiDung = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db)
):
    """Lấy thông tin một user (chỉ admin/manager)"""
    try:
        return user_service.get_user(db, user_id)
    except DomainError as exc:
        _raise_http(exc)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    current_user: NguoiDung = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Tạo user mới (chỉ admin)"""
    try:
        return user_service.create_user(db, user_data)
    except DomainError as exc:
        _raise_http(exc)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: NguoiDung = Depends(get_current_active_user),  # Cho phép bất kỳ user nào đã login
    db: Session = Depends(get_db)
):
    """Cập nhật user (user tự update profile của mình, hoặc admin/manager update bất kỳ user nào)"""
    try:
        return user_service.update_user(db, user_id, user_data, current_user)
    except DomainError as exc:
        _raise_http(exc)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: NguoiDung = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Xóa user (chỉ admin, không cho xóa chính mình)"""
    try:
        user_service.delete_user(db, user_id, current_user)
    except DomainError as exc:
        _raise_http(exc)
    return None


@router.post("/{user_id}/avatar", status_code=status.HTTP_200_OK)
async def upload_user_avatar(
    user_id: int,
    file: UploadFile = File(...),
    current_user: NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload avatar cho user (chỉ user tự upload cho mình)"""
    file_content = await file.read()
    try:
        avatar_url = user_service.upload_avatar(
            db, user_id, current_user, file.content_type, file.filename, file_content,
        )
    except DomainError as exc:
        _raise_http(exc)
    return JSONResponse({"avatar_url": avatar_url, "message": "Upload avatar thành công"})
