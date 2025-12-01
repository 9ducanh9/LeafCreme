"""
User management router: CRUD operations cho người dùng
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from datetime import date
import os
import uuid
from pathlib import Path
from app.db import get_db
from app.models import NguoiDung, VaiTro
from app.core.dependencies import get_current_active_user, require_role, get_current_user
from app.core.security import get_password_hash
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/users", tags=["users"])


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
    
    class Config:
        from_attributes = True


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
    query = db.query(NguoiDung)
    
    # Filter by search
    if search:
        query = query.filter(
            or_(
                NguoiDung.ho_ten.ilike(f"%{search}%"),
                NguoiDung.email.ilike(f"%{search}%"),
                NguoiDung.ten_dang_nhap.ilike(f"%{search}%")
            )
        )
    
    # Filter by role
    if vaitro_id:
        query = query.filter(NguoiDung.vaitro_id == vaitro_id)
    
    # Filter by status
    if dang_hoat_dong is not None:
        query = query.filter(NguoiDung.dang_hoat_dong == dang_hoat_dong)
    
    users = query.offset(skip).limit(limit).all()
    
    return [
        {
            **{k: v for k, v in user.__dict__.items() if k != 'avatar_url'},
            "avatar_url": user.avatar_url,
            "lan_dang_nhap_cuoi": user.lan_dang_nhap_cuoi.isoformat() if user.lan_dang_nhap_cuoi else None,
            "ngay_tao": user.ngay_tao.isoformat(),
            "vaitro": {
                "vaitro_id": user.vaitro.vaitro_id,
                "ten_vai_tro": user.vaitro.ten_vai_tro,
                "mo_ta": user.vaitro.mo_ta
            } if user.vaitro else {}
        }
        for user in users
    ]


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: NguoiDung = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db)
):
    """Lấy thông tin một user (chỉ admin/manager)"""
    user = db.query(NguoiDung).filter(NguoiDung.nguoidung_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )
    
    return {
        **{k: v for k, v in user.__dict__.items() if k != 'avatar_url'},
        "avatar_url": user.avatar_url,
        "lan_dang_nhap_cuoi": user.lan_dang_nhap_cuoi.isoformat() if user.lan_dang_nhap_cuoi else None,
        "ngay_tao": user.ngay_tao.isoformat(),
        "vaitro": {
            "vaitro_id": user.vaitro.vaitro_id,
            "ten_vai_tro": user.vaitro.ten_vai_tro,
            "mo_ta": user.vaitro.mo_ta
        } if user.vaitro else {}
    }


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    current_user: NguoiDung = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Tạo user mới (chỉ admin)"""
    # Kiểm tra username/email đã tồn tại
    existing = db.query(NguoiDung).filter(
        (NguoiDung.ten_dang_nhap == user_data.ten_dang_nhap) |
        (NguoiDung.email == user_data.email)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập hoặc email đã tồn tại"
        )
    
    # Kiểm tra vai trò
    vaitro = db.query(VaiTro).filter(VaiTro.vaitro_id == user_data.vaitro_id).first()
    if not vaitro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vai trò không tồn tại"
        )
    
    new_user = NguoiDung(
        ten_dang_nhap=user_data.ten_dang_nhap,
        email=user_data.email,
        mat_khau_ma_hoa=get_password_hash(user_data.mat_khau),
        vaitro_id=user_data.vaitro_id,
        ho_ten=user_data.ho_ten,
        so_dien_thoai=user_data.so_dien_thoai,
        dia_chi=user_data.dia_chi,
        ngay_sinh=user_data.ngay_sinh,
        gioi_tinh=user_data.gioi_tinh,
        dang_hoat_dong=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        **{k: v for k, v in new_user.__dict__.items() if k != 'avatar_url'},
        "avatar_url": new_user.avatar_url,
        "lan_dang_nhap_cuoi": None,
        "ngay_tao": new_user.ngay_tao.isoformat(),
        "vaitro": {
            "vaitro_id": vaitro.vaitro_id,
            "ten_vai_tro": vaitro.ten_vai_tro,
            "mo_ta": vaitro.mo_ta
        }
    }


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: NguoiDung = Depends(get_current_active_user),  # Cho phép bất kỳ user nào đã login
    db: Session = Depends(get_db)
):
    """Cập nhật user (user tự update profile của mình, hoặc admin/manager update bất kỳ user nào)"""
    user = db.query(NguoiDung).filter(NguoiDung.nguoidung_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )
    
    # Kiểm tra quyền: User chỉ có thể tự update profile của mình (trừ admin/manager)
    is_admin = current_user.vaitro.ten_vai_tro == "admin" if current_user.vaitro else False
    is_manager = current_user.vaitro.ten_vai_tro == "manager" if current_user.vaitro else False
    
    if not (is_admin or is_manager) and current_user.nguoidung_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chỉ có thể cập nhật thông tin của chính mình"
        )
    
    # Update fields
    update_data = user_data.model_dump(exclude_unset=True)
    
    # Xử lý avatar_url từ request
    if "avatar_url" in update_data and not update_data["avatar_url"]:
        # Nếu avatar_url là null hoặc empty string, set thành None để xóa avatar
        update_data["avatar_url"] = None
    
    # Kiểm tra email unique (nếu đổi email)
    if "email" in update_data and update_data["email"] != user.email:
        existing = db.query(NguoiDung).filter(NguoiDung.email == update_data["email"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email đã được sử dụng"
            )
    
    # Kiểm tra vai trò (chỉ admin mới đổi được)
    if "vaitro_id" in update_data:
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ admin mới có quyền đổi vai trò"
            )
        vaitro = db.query(VaiTro).filter(VaiTro.vaitro_id == update_data["vaitro_id"]).first()
        if not vaitro:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vai trò không tồn tại"
            )
    
    # Cập nhật
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return {
        **{k: v for k, v in user.__dict__.items() if k != 'avatar_url'},
        "avatar_url": user.avatar_url,
        "lan_dang_nhap_cuoi": user.lan_dang_nhap_cuoi.isoformat() if user.lan_dang_nhap_cuoi else None,
        "ngay_tao": user.ngay_tao.isoformat(),
        "vaitro": {
            "vaitro_id": user.vaitro.vaitro_id,
            "ten_vai_tro": user.vaitro.ten_vai_tro,
            "mo_ta": user.vaitro.mo_ta
        } if user.vaitro else {}
    }


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: NguoiDung = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Xóa user (chỉ admin, không cho xóa chính mình)"""
    if current_user.nguoidung_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa chính mình"
        )
    
    user = db.query(NguoiDung).filter(NguoiDung.nguoidung_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )
    
    db.delete(user)
    db.commit()
    
    return None


@router.post("/{user_id}/avatar", status_code=status.HTTP_200_OK)
async def upload_user_avatar(
    user_id: int,
    file: UploadFile = File(...),
    current_user: NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload avatar cho user (chỉ user tự upload cho mình)"""
    # Kiểm tra user có tồn tại không
    user = db.query(NguoiDung).filter(NguoiDung.nguoidung_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )
    
    # Kiểm tra quyền (chỉ user tự upload cho mình)
    if current_user.nguoidung_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chỉ có thể upload avatar cho chính mình"
        )
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File phải là ảnh"
        )
    
    # Validate file size (max 5MB)
    file_content = await file.read()
    if len(file_content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kích thước file không được vượt quá 5MB"
        )
    
    # Tạo thư mục uploads nếu chưa có
    upload_dir = Path("uploads/avatars")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix if file.filename else '.jpg'
    unique_filename = f"{user_id}_{uuid.uuid4().hex}{file_ext}"
    file_path = upload_dir / unique_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Generate URL (trong production nên dùng cloud storage)
    avatar_url = f"/uploads/avatars/{unique_filename}"
    
    # Update user (database column name: avatar_url)
    user.avatar_url = avatar_url
    db.commit()
    db.refresh(user)
    
    return JSONResponse({
        "avatar_url": avatar_url,
        "avatar_url": avatar_url,
        "message": "Upload avatar thành công"
    })


