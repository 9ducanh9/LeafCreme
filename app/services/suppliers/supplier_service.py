"""
Supplier domain service.

Extracted from app/routers/suppliers.py (Phase 1 service-layer migration —
same pattern as the other domains). Returns ORM objects directly, like
ProductService, since the response schema needs no extra computed fields.
"""
from typing import Any, Optional

from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.models import NhaCungCap
from app.schemas import validate_thong_tin_thanh_toan
from app.services.errors import DomainError


class SupplierService:
    def _get_or_404(self, db: Session, supplier_id: int) -> NhaCungCap:
        supplier = db.query(NhaCungCap).filter(NhaCungCap.ncc_id == supplier_id).first()
        if not supplier:
            raise DomainError(status_code=404, detail="Nhà cung cấp không tồn tại")
        return supplier

    def list_suppliers(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        dang_hoat_dong: Optional[bool] = None,
    ) -> list[NhaCungCap]:
        query = db.query(NhaCungCap)
        if dang_hoat_dong is not None:
            query = query.filter(NhaCungCap.dang_hoat_dong == dang_hoat_dong)
        if search:
            search_term = f"%{search}%"
            query = query.filter(or_(
                NhaCungCap.ten_ncc.ilike(search_term),
                NhaCungCap.ma_ncc.ilike(search_term),
                NhaCungCap.email.ilike(search_term),
                NhaCungCap.so_dien_thoai.ilike(search_term),
                NhaCungCap.nguoi_lien_he.ilike(search_term),
            ))
        return query.order_by(desc(NhaCungCap.ngay_tao)).offset(skip).limit(limit).all()

    def get_supplier(self, db: Session, supplier_id: int) -> NhaCungCap:
        return self._get_or_404(db, supplier_id)

    def create_supplier(self, db: Session, payload: Any) -> NhaCungCap:
        if payload.ma_ncc:
            existing = db.query(NhaCungCap).filter(NhaCungCap.ma_ncc == payload.ma_ncc).first()
            if existing:
                raise DomainError(status_code=400, detail=f"Mã nhà cung cấp '{payload.ma_ncc}' đã tồn tại")

        thong_tin_tt = None
        if payload.thong_tin_thanh_toan:
            try:
                thong_tin_tt = validate_thong_tin_thanh_toan(payload.thong_tin_thanh_toan.model_dump())
            except Exception as e:
                raise DomainError(status_code=400, detail=f"Thông tin thanh toán không hợp lệ: {str(e)}")

        supplier = NhaCungCap(
            ten_ncc=payload.ten_ncc,
            ma_ncc=payload.ma_ncc,
            nguoi_lien_he=payload.nguoi_lien_he,
            so_dien_thoai=payload.so_dien_thoai,
            email=payload.email,
            dia_chi=payload.dia_chi,
            thong_tin_thanh_toan=thong_tin_tt,
            ghi_chu=payload.ghi_chu,
            dang_hoat_dong=payload.dang_hoat_dong,
        )
        db.add(supplier)
        db.commit()
        db.refresh(supplier)
        return supplier

    def update_supplier(self, db: Session, supplier_id: int, payload: Any) -> NhaCungCap:
        supplier = self._get_or_404(db, supplier_id)

        if payload.ma_ncc and payload.ma_ncc != supplier.ma_ncc:
            existing = db.query(NhaCungCap).filter(
                NhaCungCap.ma_ncc == payload.ma_ncc, NhaCungCap.ncc_id != supplier_id,
            ).first()
            if existing:
                raise DomainError(status_code=400, detail=f"Mã nhà cung cấp '{payload.ma_ncc}' đã tồn tại")

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

        if payload.thong_tin_thanh_toan is not None:
            try:
                supplier.thong_tin_thanh_toan = validate_thong_tin_thanh_toan(
                    payload.thong_tin_thanh_toan.model_dump()
                )
            except Exception as e:
                raise DomainError(status_code=400, detail=f"Thông tin thanh toán không hợp lệ: {str(e)}")

        db.commit()
        db.refresh(supplier)
        return supplier

    def delete_supplier(self, db: Session, supplier_id: int, hard_delete: bool = False) -> None:
        supplier = self._get_or_404(db, supplier_id)

        # TODO: Kiểm tra xem nhà cung cấp có đang được sử dụng trong lô hàng
        # không. Nếu có, chỉ vô hiệu hóa thay vì xóa. (carried over from the
        # original router — not addressed by this refactor)
        if hard_delete:
            db.delete(supplier)
        else:
            supplier.dang_hoat_dong = False

        db.commit()
