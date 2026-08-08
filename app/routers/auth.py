"""
Authentication router: Login, Register, Refresh Token

Thin by design — see app.services.auth.AuthService for the business logic
(moved out as part of the Phase 1 service-layer migration).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import NguoiDung
from app.core.dependencies import get_current_user
from app.services.auth import AuthService, DomainError
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

router = APIRouter(prefix="/auth", tags=["authentication"])
auth_service = AuthService()


def _raise_http(exc: DomainError, headers: dict | None = None) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail, headers=headers)


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
    try:
        return auth_service.register(db, user_data)
    except DomainError as exc:
        _raise_http(exc)


@router.post("/login", response_model=LoginResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login với username/password
    Có thể dùng username hoặc email để login
    """
    try:
        return auth_service.login(db, form_data.username, form_data.password)
    except DomainError as exc:
        # Only the "invalid credentials" 401 carries WWW-Authenticate in the
        # original code — the "account disabled" 403 doesn't. Preserved here
        # rather than adding the header to every 401 uniformly.
        headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
        _raise_http(exc, headers)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(token_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token từ refresh token"""
    try:
        return auth_service.refresh_token(db, token_data.refresh_token)
    except DomainError as exc:
        _raise_http(exc)


@router.get("/me")
def get_current_user_info(current_user: NguoiDung = Depends(get_current_user)):
    """Lấy thông tin user hiện tại"""
    return auth_service.current_user_info(current_user)
