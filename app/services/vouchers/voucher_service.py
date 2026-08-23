from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.models import PhieuGiamGia
from app.schemas import SanPhamApDung
from app.services.errors import DomainError


class VoucherService:
    """Admin CRUD for the same voucher rows used by order checkout."""

    @staticmethod
    def _normalize_code(code: str) -> str:
        code = code.strip().upper()
        if not code:
            raise DomainError(status_code=400, detail="Mã voucher không được để trống")
        return code

    @staticmethod
    def _validate_application(value: dict | None) -> dict | None:
        if value is None:
            return {"loai_ap_dung": "all", "danh_sach_id": None}
        try:
            return SanPhamApDung.model_validate(value).model_dump()
        except ValueError as exc:
            raise DomainError(status_code=400, detail="Cấu hình sản phẩm áp dụng không hợp lệ") from exc

    @staticmethod
    def _validate_discount(loai_giam: str, gia_tri_giam: Decimal) -> None:
        if loai_giam == "phantram" and gia_tri_giam > 100:
            raise DomainError(status_code=400, detail="Giảm phần trăm không được vượt quá 100")

    # Allowlist — không nhận cột tự do từ client (SQL injection nếu truyền
    # thẳng vào order_by). Khớp với VoucherSortField ở router.
    SORT_COLUMNS = {
        "ngay_tao": PhieuGiamGia.ngay_tao,
        "ma_phieu": PhieuGiamGia.ma_phieu,
        "ngay_het_han": PhieuGiamGia.ngay_het_han,
    }

    def list(self, db: Session, *, skip: int = 0, limit: int = 50, search: Optional[str] = None, dang_hoat_dong: Optional[bool] = None, loai_giam: Optional[str] = None, sort_by: str = "ngay_tao", sort_dir: str = "desc") -> dict:
        query = db.query(PhieuGiamGia)
        if search:
            needle = f"%{search.strip()}%"
            query = query.filter(PhieuGiamGia.ma_phieu.ilike(needle) | PhieuGiamGia.ten_phieu.ilike(needle))
        if dang_hoat_dong is not None:
            query = query.filter(PhieuGiamGia.dang_hoat_dong == dang_hoat_dong)
        if loai_giam:
            query = query.filter(PhieuGiamGia.loai_giam == loai_giam)
        total = query.count()
        sort_col = self.SORT_COLUMNS.get(sort_by, PhieuGiamGia.ngay_tao)
        ordering = sort_col.asc() if sort_dir == "asc" else sort_col.desc()
        # Tie-breaker bắt buộc — nhiều dòng cùng giá trị sort thì offset
        # pagination sẽ trùng/mất dòng giữa các trang nếu không có nó.
        items = query.order_by(ordering, PhieuGiamGia.phieugiam_id.desc()).offset(skip).limit(limit).all()
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    def list_active(self, db: Session, *, limit: int = 200) -> list[PhieuGiamGia]:
        """Return only vouchers that can currently be presented to shoppers.

        This is intentionally separate from the admin list: storefront and
        assistant requests must not need an admin capability just to validate
        a public promotion. Checkout still revalidates the row transactionally.
        """

        now = utc_now()
        return (
            db.query(PhieuGiamGia)
            .filter(
                PhieuGiamGia.dang_hoat_dong.is_(True),
                PhieuGiamGia.ngay_bat_dau <= now,
                PhieuGiamGia.ngay_het_han >= now,
                or_(
                    PhieuGiamGia.gioi_han_su_dung == 0,
                    PhieuGiamGia.so_lan_da_dung < PhieuGiamGia.gioi_han_su_dung,
                ),
            )
            .order_by(PhieuGiamGia.ngay_het_han.asc(), PhieuGiamGia.phieugiam_id.asc())
            .limit(max(1, min(limit, 200)))
            .all()
        )

    def get(self, db: Session, voucher_id: int) -> PhieuGiamGia:
        voucher = db.query(PhieuGiamGia).filter(PhieuGiamGia.phieugiam_id == voucher_id).first()
        if not voucher:
            raise DomainError(status_code=404, detail="Không tìm thấy voucher")
        return voucher

    def create(self, db: Session, payload) -> PhieuGiamGia:
        data = payload.model_dump()
        data["ma_phieu"] = self._normalize_code(data["ma_phieu"])
        data["san_pham_ap_dung"] = self._validate_application(data.get("san_pham_ap_dung"))
        data.setdefault("ngay_bat_dau", utc_now())
        self._validate_discount(data["loai_giam"], data["gia_tri_giam"])
        try:
            voucher = PhieuGiamGia(**data)
            db.add(voucher)
            db.commit()
            db.refresh(voucher)
            return voucher
        except IntegrityError as exc:
            db.rollback()
            raise DomainError(status_code=409, detail="Mã voucher đã tồn tại") from exc

    def update(self, db: Session, voucher_id: int, payload) -> PhieuGiamGia:
        voucher = self.get(db, voucher_id)
        data = payload.model_dump(exclude_unset=True)
        if "ma_phieu" in data:
            data["ma_phieu"] = self._normalize_code(data["ma_phieu"])
        if "san_pham_ap_dung" in data:
            data["san_pham_ap_dung"] = self._validate_application(data["san_pham_ap_dung"])
        self._validate_discount(
            data.get("loai_giam", voucher.loai_giam),
            data.get("gia_tri_giam", voucher.gia_tri_giam),
        )
        for field, value in data.items():
            setattr(voucher, field, value)
        try:
            db.commit()
            db.refresh(voucher)
            return voucher
        except IntegrityError as exc:
            db.rollback()
            raise DomainError(status_code=409, detail="Mã voucher đã tồn tại") from exc

    def delete(self, db: Session, voucher_id: int) -> None:
        voucher = self.get(db, voucher_id)
        voucher.dang_hoat_dong = False
        db.commit()
