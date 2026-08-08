"""
User domain service.

Extracted from app/routers/users.py (Phase 1 service-layer migration —
same pattern as payments/batches/alerts/gift_boxes/products).

One small, deliberate cleanup beyond a literal move: the original router
built each response dict via `{**user.__dict__, ...}`, which spreads every
mapped column on the ORM instance — including `mat_khau_ma_hoa` (the
password hash) and SQLAlchemy's internal `_sa_instance_state` — into a
plain dict, relying on FastAPI's `response_model=UserResponse` to filter
those back out before serialization. That filtering does work (nothing was
actually exposed to clients), but it's fragile: it depends on every caller
remembering to route the result through that exact response_model. This
service builds the response dict explicitly field-by-field instead, so a
mistake elsewhere can't accidentally serialize the password hash. No
change to what a client receives.
"""
import uuid
from pathlib import Path
from typing import Any, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models import NguoiDung, VaiTro
from app.services.errors import DomainError

_MAX_AVATAR_BYTES = 5 * 1024 * 1024


class UserService:
    # ------------------------------------------------------------------
    @staticmethod
    def _to_response(user: NguoiDung) -> dict:
        return {
            "nguoidung_id": user.nguoidung_id,
            "ten_dang_nhap": user.ten_dang_nhap,
            "email": user.email,
            "ho_ten": user.ho_ten,
            "so_dien_thoai": user.so_dien_thoai,
            "dia_chi": user.dia_chi,
            "ngay_sinh": user.ngay_sinh,
            "gioi_tinh": user.gioi_tinh,
            "avatar_url": user.avatar_url,
            "dang_hoat_dong": user.dang_hoat_dong,
            "lan_dang_nhap_cuoi": user.lan_dang_nhap_cuoi.isoformat() if user.lan_dang_nhap_cuoi else None,
            "ngay_tao": user.ngay_tao.isoformat(),
            "vaitro": {
                "vaitro_id": user.vaitro.vaitro_id,
                "ten_vai_tro": user.vaitro.ten_vai_tro,
                "mo_ta": user.vaitro.mo_ta,
            } if user.vaitro else {},
        }

    @staticmethod
    def _is_admin(user: NguoiDung) -> bool:
        return user.vaitro.ten_vai_tro == "admin" if user.vaitro else False

    @staticmethod
    def _is_manager(user: NguoiDung) -> bool:
        return user.vaitro.ten_vai_tro == "manager" if user.vaitro else False

    def _get_user_or_404(self, db: Session, user_id: int) -> NguoiDung:
        user = db.query(NguoiDung).filter(NguoiDung.nguoidung_id == user_id).first()
        if not user:
            raise DomainError(status_code=404, detail="Người dùng không tồn tại")
        return user

    # ------------------------------------------------------------------
    def list_users(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        vaitro_id: Optional[int] = None,
        dang_hoat_dong: Optional[bool] = None,
    ) -> list[dict]:
        query = db.query(NguoiDung)
        if search:
            query = query.filter(or_(
                NguoiDung.ho_ten.ilike(f"%{search}%"),
                NguoiDung.email.ilike(f"%{search}%"),
                NguoiDung.ten_dang_nhap.ilike(f"%{search}%"),
            ))
        if vaitro_id:
            query = query.filter(NguoiDung.vaitro_id == vaitro_id)
        if dang_hoat_dong is not None:
            query = query.filter(NguoiDung.dang_hoat_dong == dang_hoat_dong)

        users = query.offset(skip).limit(limit).all()
        return [self._to_response(user) for user in users]

    def get_user(self, db: Session, user_id: int) -> dict:
        return self._to_response(self._get_user_or_404(db, user_id))

    def create_user(self, db: Session, payload: Any) -> dict:
        existing = db.query(NguoiDung).filter(
            (NguoiDung.ten_dang_nhap == payload.ten_dang_nhap) | (NguoiDung.email == payload.email)
        ).first()
        if existing:
            raise DomainError(status_code=400, detail="Tên đăng nhập hoặc email đã tồn tại")

        vaitro = db.query(VaiTro).filter(VaiTro.vaitro_id == payload.vaitro_id).first()
        if not vaitro:
            raise DomainError(status_code=404, detail="Vai trò không tồn tại")

        new_user = NguoiDung(
            ten_dang_nhap=payload.ten_dang_nhap,
            email=payload.email,
            mat_khau_ma_hoa=get_password_hash(payload.mat_khau),
            vaitro_id=payload.vaitro_id,
            ho_ten=payload.ho_ten,
            so_dien_thoai=payload.so_dien_thoai,
            dia_chi=payload.dia_chi,
            ngay_sinh=payload.ngay_sinh,
            gioi_tinh=payload.gioi_tinh,
            dang_hoat_dong=True,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return self._to_response(new_user)

    def update_user(self, db: Session, user_id: int, payload: Any, current_user: NguoiDung) -> dict:
        user = self._get_user_or_404(db, user_id)

        is_admin = self._is_admin(current_user)
        is_manager = self._is_manager(current_user)
        if not (is_admin or is_manager) and current_user.nguoidung_id != user_id:
            raise DomainError(status_code=403, detail="Bạn chỉ có thể cập nhật thông tin của chính mình")

        update_data = payload.model_dump(exclude_unset=True)

        if "avatar_url" in update_data and not update_data["avatar_url"]:
            update_data["avatar_url"] = None

        if "email" in update_data and update_data["email"] != user.email:
            existing = db.query(NguoiDung).filter(NguoiDung.email == update_data["email"]).first()
            if existing:
                raise DomainError(status_code=400, detail="Email đã được sử dụng")

        if "vaitro_id" in update_data:
            if not is_admin:
                raise DomainError(status_code=403, detail="Chỉ admin mới có quyền đổi vai trò")
            vaitro = db.query(VaiTro).filter(VaiTro.vaitro_id == update_data["vaitro_id"]).first()
            if not vaitro:
                raise DomainError(status_code=404, detail="Vai trò không tồn tại")

        for field, value in update_data.items():
            setattr(user, field, value)

        db.commit()
        db.refresh(user)
        return self._to_response(user)

    def delete_user(self, db: Session, user_id: int, current_user: NguoiDung) -> None:
        if current_user.nguoidung_id == user_id:
            raise DomainError(status_code=400, detail="Không thể xóa chính mình")

        user = self._get_user_or_404(db, user_id)
        db.delete(user)
        db.commit()

    # ------------------------------------------------------------------
    def upload_avatar(
        self,
        db: Session,
        user_id: int,
        current_user: NguoiDung,
        content_type: Optional[str],
        filename: Optional[str],
        file_content: bytes,
    ) -> str:
        user = self._get_user_or_404(db, user_id)

        if current_user.nguoidung_id != user_id:
            raise DomainError(status_code=403, detail="Bạn chỉ có thể upload avatar cho chính mình")

        if not content_type or not content_type.startswith("image/"):
            raise DomainError(status_code=400, detail="File phải là ảnh")

        if len(file_content) > _MAX_AVATAR_BYTES:
            raise DomainError(status_code=400, detail="Kích thước file không được vượt quá 5MB")

        upload_dir = Path("uploads/avatars")
        upload_dir.mkdir(parents=True, exist_ok=True)

        if user.avatar_url:
            try:
                old_avatar_path = user.avatar_url.replace("/uploads/avatars/", "")
                old_file_path = upload_dir / old_avatar_path
                if old_file_path.exists() and old_file_path.is_file():
                    old_file_path.unlink()
            except Exception:
                pass

        file_ext = Path(filename).suffix if filename else ".jpg"
        unique_filename = f"{user_id}_{uuid.uuid4().hex}{file_ext}"
        file_path = upload_dir / unique_filename

        with open(file_path, "wb") as f:
            f.write(file_content)

        avatar_url = f"/uploads/avatars/{unique_filename}"
        user.avatar_url = avatar_url
        db.commit()
        db.refresh(user)
        return avatar_url
