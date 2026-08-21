"""
Authentication domain service.

Extracted from app/routers/auth.py (Phase 1 service-layer migration — same
pattern as the other domains). Security-sensitive: password verification,
token issuance, and account-status checks are moved verbatim, not
redesigned. `app.core.security` (hashing/JWT) is untouched — this service
only orchestrates calls into it plus the DB lookups around it.
"""

from datetime import date, datetime
import re
import secrets
from typing import Any, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.core.time import utc_now
from app.core.capabilities import capabilities_for
from app.models import NguoiDung, VaiTro
from app.services.errors import DomainError

_INVALID_CREDENTIALS = "Tên đăng nhập hoặc mật khẩu không đúng"

# Public self-registration always creates a "customer" account — the role
# is looked up by name server-side, never trusted from the request. Prior
# behavior accepted an arbitrary vaitro_id from the client and only checked
# that the role existed, which let anyone self-register as admin/manager/
# staff via a raw API call (no UI needed). Fixed as a standalone hotfix —
# see docs/specs/01-auth-access-control.md Finding #1. Staff/manager/admin
# accounts must be created via POST /users (already admin-gated).
_SELF_REGISTER_ROLE_NAME = "customer"


def parse_date_vietnam(date_str: str) -> Optional[date]:
    """
    Parse ngày theo format Việt Nam (DD/MM/YYYY) hoặc ISO (YYYY-MM-DD)
    Hỗ trợ: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    """
    if not date_str:
        return None

    date_str = date_str.strip()
    formats = ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d"]

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue

    raise ValueError(
        f"Format ngày không hợp lệ: '{date_str}'. Hỗ trợ: DD/MM/YYYY (ví dụ: 16/10/2004), DD-MM-YYYY, hoặc YYYY-MM-DD"
    )


class AuthService:
    @staticmethod
    def _token_payload(user: NguoiDung, vaitro_ten: str) -> dict:
        access_token = create_access_token(data={"sub": user.nguoidung_id})
        refresh_token_str = create_refresh_token(data={"sub": user.nguoidung_id})
        return {
            "access_token": access_token,
            "refresh_token": refresh_token_str,
            "token_type": "bearer",
            "user_id": user.nguoidung_id,
            "ten_dang_nhap": user.ten_dang_nhap,
            "ho_ten": user.ho_ten,
            "vaitro": vaitro_ten,
        }

    def register(self, db: Session, payload: Any) -> dict:
        existing_user = (
            db.query(NguoiDung)
            .filter((NguoiDung.ten_dang_nhap == payload.ten_dang_nhap) | (NguoiDung.email == payload.email))
            .first()
        )
        if existing_user:
            raise DomainError(status_code=400, detail="Tên đăng nhập hoặc email đã tồn tại")

        # Deliberately NOT payload.vaitro_id — see _SELF_REGISTER_ROLE_NAME
        # above. Any vaitro_id the client sends is ignored.
        vaitro = db.query(VaiTro).filter(VaiTro.ten_vai_tro == _SELF_REGISTER_ROLE_NAME).first()
        if not vaitro:
            raise DomainError(
                status_code=500,
                detail="Vai trò mặc định 'customer' chưa được cấu hình trên hệ thống",
            )

        ngay_sinh = None
        if payload.ngay_sinh:
            try:
                ngay_sinh = parse_date_vietnam(payload.ngay_sinh)
            except ValueError as e:
                raise DomainError(status_code=400, detail=str(e))

        new_user = NguoiDung(
            ten_dang_nhap=payload.ten_dang_nhap,
            email=payload.email,
            mat_khau_ma_hoa=get_password_hash(payload.mat_khau),
            vaitro_id=vaitro.vaitro_id,
            ho_ten=payload.ho_ten,
            so_dien_thoai=payload.so_dien_thoai,
            dia_chi=payload.dia_chi,
            ngay_sinh=ngay_sinh,
            gioi_tinh=payload.gioi_tinh,
            dang_hoat_dong=True,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return self._token_payload(new_user, vaitro.ten_vai_tro)

    def login(self, db: Session, username: str, password: str) -> dict:
        user = db.query(NguoiDung).filter((NguoiDung.ten_dang_nhap == username) | (NguoiDung.email == username)).first()

        if not user or not verify_password(password, user.mat_khau_ma_hoa):
            # Same message/status for "no such user" and "wrong password" —
            # deliberate in the original code, don't leak which one it was.
            raise DomainError(status_code=401, detail=_INVALID_CREDENTIALS)

        if not user.dang_hoat_dong:
            raise DomainError(status_code=403, detail="Tài khoản đã bị vô hiệu hóa")

        user.lan_dang_nhap_cuoi = utc_now()
        db.commit()

        vaitro_ten = user.vaitro.ten_vai_tro if user.vaitro else "N/A"
        return self._token_payload(user, vaitro_ten)

    def refresh_token(self, db: Session, refresh_token_str: str) -> dict:
        payload = decode_token(refresh_token_str)
        if payload is None or payload.get("type") != "refresh":
            raise DomainError(status_code=401, detail="Invalid refresh token")

        user_id = payload.get("sub")
        user = db.query(NguoiDung).filter(NguoiDung.nguoidung_id == user_id).first()
        if not user or not user.dang_hoat_dong:
            raise DomainError(status_code=401, detail="User not found or disabled")

        vaitro_ten = user.vaitro.ten_vai_tro if user.vaitro else "N/A"
        return self._token_payload(user, vaitro_ten)

    def provision_cognito_user(self, db: Session, claims: dict, profile: Any | None = None) -> dict:
        """Link a Cognito identity to a local user or create a customer.

        Roles remain exclusively in PostgreSQL. An existing account is linked
        only when Cognito has verified the same email, preserving current admin
        and staff permissions without copying any role from token claims.
        """
        subject = claims.get("sub")
        email = str(claims.get("email") or "").strip().lower()
        if not subject or not email:
            raise DomainError(status_code=401, detail="Cognito identity must include an email")

        # Federated providers can omit email_verified even after Cognito has
        # authenticated the user. Such an identity may create its own customer
        # account, but it must never be used to take over an existing account.
        has_verified_email = claims.get("email_verified") is True

        user = db.query(NguoiDung).filter(NguoiDung.cognito_sub == subject).first()
        if user is None:
            user = db.query(NguoiDung).filter(func.lower(NguoiDung.email) == email).first()
            if user is not None:
                if not has_verified_email:
                    raise DomainError(
                        status_code=401,
                        detail="Cognito identity must have a verified email to link an existing account",
                    )
                if user.cognito_sub and user.cognito_sub != subject:
                    raise DomainError(status_code=409, detail="Email is already linked to another Cognito identity")
                user.cognito_sub = subject
            else:
                role = db.query(VaiTro).filter(VaiTro.ten_vai_tro == _SELF_REGISTER_ROLE_NAME).first()
                if role is None:
                    raise DomainError(
                        status_code=500,
                        detail="Vai trÃ² máº·c Ä‘á»‹nh 'customer' chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh trÃªn há»‡ thá»‘ng",
                    )

                profile_matches_identity = (
                    profile is not None and str(getattr(profile, "email", "")).strip().lower() == email
                )
                base_name = str(
                    getattr(profile, "ten_dang_nhap", "")
                    if profile_matches_identity
                    else claims.get("preferred_username") or email.split("@", 1)[0]
                )
                base_name = re.sub(r"[^a-zA-Z0-9_.-]", "", base_name)[:40] or "customer"
                username = f"{base_name}-{subject.replace('-', '')[:8]}"
                ngay_sinh = None
                if profile_matches_identity and getattr(profile, "ngay_sinh", None):
                    try:
                        ngay_sinh = parse_date_vietnam(profile.ngay_sinh)
                    except ValueError:
                        ngay_sinh = None
                user = NguoiDung(
                    ten_dang_nhap=username,
                    email=email,
                    cognito_sub=subject,
                    mat_khau_ma_hoa=get_password_hash(secrets.token_urlsafe(32)),
                    vaitro_id=role.vaitro_id,
                    ho_ten=str(
                        getattr(profile, "ho_ten", "")
                        if profile_matches_identity
                        else claims.get("name") or email.split("@", 1)[0]
                    )[:100],
                    so_dien_thoai=getattr(profile, "so_dien_thoai", None) if profile_matches_identity else None,
                    dia_chi=getattr(profile, "dia_chi", None) if profile_matches_identity else None,
                    ngay_sinh=ngay_sinh,
                    gioi_tinh=getattr(profile, "gioi_tinh", None) if profile_matches_identity else None,
                    dang_hoat_dong=True,
                )
                db.add(user)

        if not user.dang_hoat_dong:
            raise DomainError(status_code=403, detail="TÃ i khoáº£n Ä‘Ã£ bá»‹ vÃ´ hiá»‡u hÃ³a")

        user.lan_dang_nhap_cuoi = utc_now()
        db.commit()
        db.refresh(user)
        return self.current_user_info(user)

    @staticmethod
    def current_user_info(current_user: NguoiDung) -> dict:
        role = current_user.vaitro.ten_vai_tro if current_user.vaitro else None
        return {
            "nguoidung_id": current_user.nguoidung_id,
            "ten_dang_nhap": current_user.ten_dang_nhap,
            "email": current_user.email,
            "ho_ten": current_user.ho_ten,
            "so_dien_thoai": current_user.so_dien_thoai,
            "dia_chi": current_user.dia_chi,
            "ngay_sinh": current_user.ngay_sinh.isoformat() if current_user.ngay_sinh else None,
            "gioi_tinh": current_user.gioi_tinh,
            "avatar_url": current_user.avatar_url,
            "dang_hoat_dong": current_user.dang_hoat_dong,
            "capabilities": capabilities_for(role),
            "vaitro": {
                "vaitro_id": current_user.vaitro.vaitro_id,
                "ten_vai_tro": current_user.vaitro.ten_vai_tro,
                "mo_ta": current_user.vaitro.mo_ta,
            }
            if current_user.vaitro
            else None,
        }
