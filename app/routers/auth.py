"""
Authentication router: Login, Register, Refresh Token
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from app.db import get_db
from app.models import NguoiDung, VaiTro
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token, decode_token
)
from app.core.config import settings
from app.core.dependencies import get_current_user
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

router = APIRouter(prefix="/auth", tags=["authentication"])


# =========================================================
# Helper Functions
# =========================================================
def parse_date_vietnam(date_str: str) -> date | None:
    """
    Parse ngày theo format Việt Nam (DD/MM/YYYY) hoặc ISO (YYYY-MM-DD)
    Hỗ trợ: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    """
    if not date_str:
        return None
    
    date_str = date_str.strip()
    formats = [
        ("%d/%m/%Y", "DD/MM/YYYY"),      # Format Việt Nam
        ("%d-%m-%Y", "DD-MM-YYYY"),      # Format Việt Nam (dấu gạch ngang)
        ("%Y-%m-%d", "YYYY-MM-DD"),      # Format ISO
    ]
    
    for fmt, fmt_name in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    
    raise ValueError(
        f"Format ngày không hợp lệ: '{date_str}'. "
        f"Hỗ trợ: DD/MM/YYYY (ví dụ: 16/10/2004), DD-MM-YYYY, hoặc YYYY-MM-DD"
    )


# =========================================================
# Request/Response Schemas
# =========================================================
class UserRegister(BaseModel):
    ten_dang_nhap: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    mat_khau: str = Field(..., min_length=6)
    ho_ten: str = Field(..., min_length=1, max_length=100)
    vaitro_id: int = Field(..., gt=0)
    so_dien_thoai: Optional[str] = Field(None, max_length=20)
    dia_chi: Optional[str] = None
    ngay_sinh: Optional[str] = Field(None, description="Format: DD/MM/YYYY (ví dụ: 16/10/2004) hoặc YYYY-MM-DD")
    gioi_tinh: Optional[str] = Field(None, max_length=10)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    ten_dang_nhap: str
    ho_ten: str
    vaitro: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LoginResponse(TokenResponse):
    pass


# =========================================================
# Endpoints
# =========================================================
@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Đăng ký người dùng mới"""
    # Kiểm tra username đã tồn tại
    existing_user = db.query(NguoiDung).filter(
        (NguoiDung.ten_dang_nhap == user_data.ten_dang_nhap) |
        (NguoiDung.email == user_data.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập hoặc email đã tồn tại"
        )
    
    # Kiểm tra vai trò tồn tại
    vaitro = db.query(VaiTro).filter(VaiTro.vaitro_id == user_data.vaitro_id).first()
    if not vaitro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vai trò không tồn tại"
        )
    
    # Parse ngày sinh (hỗ trợ format Việt Nam)
    ngay_sinh = None
    if user_data.ngay_sinh:
        try:
            ngay_sinh = parse_date_vietnam(user_data.ngay_sinh)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    
    # Tạo user mới
    new_user = NguoiDung(
        ten_dang_nhap=user_data.ten_dang_nhap,
        email=user_data.email,
        mat_khau_ma_hoa=get_password_hash(user_data.mat_khau),
        vaitro_id=user_data.vaitro_id,
        ho_ten=user_data.ho_ten,
        so_dien_thoai=user_data.so_dien_thoai,
        dia_chi=user_data.dia_chi,
        ngay_sinh=ngay_sinh,
        gioi_tinh=user_data.gioi_tinh,
        dang_hoat_dong=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Tạo tokens
    access_token = create_access_token(data={"sub": new_user.nguoidung_id})
    refresh_token = create_refresh_token(data={"sub": new_user.nguoidung_id})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user_id": new_user.nguoidung_id,
        "ten_dang_nhap": new_user.ten_dang_nhap,
        "ho_ten": new_user.ho_ten,
        "vaitro": vaitro.ten_vai_tro
    }


@router.post("/login", response_model=LoginResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login với username/password
    Có thể dùng username hoặc email để login
    """
    # Tìm user theo username hoặc email
    user = db.query(NguoiDung).filter(
        (NguoiDung.ten_dang_nhap == form_data.username) |
        (NguoiDung.email == form_data.username)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, user.mat_khau_ma_hoa):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.dang_hoat_dong:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa"
        )
    
    # Cập nhật lần đăng nhập cuối
    user.lan_dang_nhap_cuoi = datetime.utcnow()
    db.commit()
    
    # Tạo tokens
    access_token = create_access_token(data={"sub": user.nguoidung_id})
    refresh_token = create_refresh_token(data={"sub": user.nguoidung_id})
    
    vaitro_ten = user.vaitro.ten_vai_tro if user.vaitro else "N/A"
    
    # Debug: Log token creation
    import logging
    logger = logging.getLogger("bakeryonl.api")
    logger.info(f"Login successful for user {user.ten_dang_nhap} (ID: {user.nguoidung_id})")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user_id": user.nguoidung_id,
        "ten_dang_nhap": user.ten_dang_nhap,
        "ho_ten": user.ho_ten,
        "vaitro": vaitro_ten
    }


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(token_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token từ refresh token"""
    payload = decode_token(token_data.refresh_token)
    
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    user = db.query(NguoiDung).filter(NguoiDung.nguoidung_id == user_id).first()
    
    if not user or not user.dang_hoat_dong:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or disabled"
        )
    
    # Tạo access token mới
    new_access_token = create_access_token(data={"sub": user.nguoidung_id})
    new_refresh_token = create_refresh_token(data={"sub": user.nguoidung_id})
    
    vaitro_ten = user.vaitro.ten_vai_tro if user.vaitro else "N/A"
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "user_id": user.nguoidung_id,
        "ten_dang_nhap": user.ten_dang_nhap,
        "ho_ten": user.ho_ten,
        "vaitro": vaitro_ten
    }


@router.get("/me")
def get_current_user_info(current_user: NguoiDung = Depends(get_current_user)):
    """Lấy thông tin user hiện tại"""
    return {
        "nguoidung_id": current_user.nguoidung_id,
        "ten_dang_nhap": current_user.ten_dang_nhap,
        "email": current_user.email,
        "ho_ten": current_user.ho_ten,
        "so_dien_thoai": current_user.so_dien_thoai,
        "dia_chi": current_user.dia_chi,
        "ngay_sinh": current_user.ngay_sinh.isoformat() if current_user.ngay_sinh else None,
        "gioi_tinh": current_user.gioi_tinh,
        "dang_hoat_dong": current_user.dang_hoat_dong,
        "vaitro": {
            "vaitro_id": current_user.vaitro.vaitro_id,
            "ten_vai_tro": current_user.vaitro.ten_vai_tro,
            "mo_ta": current_user.vaitro.mo_ta
        } if current_user.vaitro else None
    }

