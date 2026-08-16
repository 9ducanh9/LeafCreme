"""
Tests for app.services.suppliers.SupplierService — Phase 1 service-layer
migration (see app/services/suppliers/supplier_service.py).
"""

from datetime import timedelta
from decimal import Decimal

import pytest

from app.core.time import utc_now
from app.models import BienTheSanPham, LoHangSanPham, NhaCungCap, SanPham
from app.services.suppliers import DomainError, SupplierService


@pytest.fixture()
def service() -> SupplierService:
    return SupplierService()


class _SupplierPayload:
    def __init__(self, ten_ncc, ma_ncc=None):
        self.ten_ncc = ten_ncc
        self.ma_ncc = ma_ncc
        self.nguoi_lien_he = None
        self.so_dien_thoai = None
        self.email = None
        self.dia_chi = None
        self.thong_tin_thanh_toan = None
        self.ghi_chu = None
        self.dang_hoat_dong = True


class _SupplierUpdatePayload:
    def __init__(self, **fields):
        defaults = dict(
            ten_ncc=None,
            ma_ncc=None,
            nguoi_lien_he=None,
            so_dien_thoai=None,
            email=None,
            dia_chi=None,
            thong_tin_thanh_toan=None,
            ghi_chu=None,
            dang_hoat_dong=None,
        )
        defaults.update(fields)
        for k, v in defaults.items():
            setattr(self, k, v)


class TestCreateSupplier:
    def test_rejects_duplicate_ma_ncc(self, db_session, service):
        service.create_supplier(db_session, _SupplierPayload("NCC A", ma_ncc="NCC-DUP"))
        with pytest.raises(DomainError) as exc_info:
            service.create_supplier(db_session, _SupplierPayload("NCC B", ma_ncc="NCC-DUP"))
        assert exc_info.value.status_code == 400


class TestDeleteSupplier:
    def test_default_delete_is_soft(self, db_session, service):
        supplier = service.create_supplier(db_session, _SupplierPayload("NCC Soft Delete"))
        service.delete_supplier(db_session, supplier.ncc_id, hard_delete=False)

        still_there = db_session.query(NhaCungCap).filter(NhaCungCap.ncc_id == supplier.ncc_id).first()
        assert still_there is not None
        assert still_there.dang_hoat_dong is False

    def test_hard_delete_removes_row(self, db_session, service):
        supplier = service.create_supplier(db_session, _SupplierPayload("NCC Hard Delete"))
        service.delete_supplier(db_session, supplier.ncc_id, hard_delete=True)

        gone = db_session.query(NhaCungCap).filter(NhaCungCap.ncc_id == supplier.ncc_id).first()
        assert gone is None

    def test_not_found_raises_404(self, db_session, service):
        with pytest.raises(DomainError) as exc_info:
            service.delete_supplier(db_session, 999999)
        assert exc_info.value.status_code == 404

    def test_hard_delete_blocked_when_supplier_has_a_batch(self, db_session, service):
        """See docs/specs/06-users-suppliers.md Finding #2 — hard-deleting a
        supplier that has ever had a batch logged against it must raise a
        clean 400, not an unhandled IntegrityError -> bare 500."""
        supplier = service.create_supplier(db_session, _SupplierPayload("NCC Có Lô Hàng"))

        product = SanPham(ten="SP cho lô hàng", sku="SP-BATCH-TEST", gia_co_ban=Decimal("10000"))
        db_session.add(product)
        db_session.flush()
        variant = BienTheSanPham(sanpham_id=product.sanpham_id, huong_vi="Vani", gia_bienthe=Decimal("10000"))
        db_session.add(variant)
        db_session.flush()

        batch = LoHangSanPham(
            bienthe_sanpham_id=variant.bienthe_id,
            ncc_id=supplier.ncc_id,
            ma_lo="LOT-SUPPLIER-BLOCK-1",
            ngay_het_han=utc_now() + timedelta(days=30),
            so_luong=10,
            gia_don_vi=Decimal("5000"),
        )
        db_session.add(batch)
        db_session.commit()

        with pytest.raises(DomainError) as exc_info:
            service.delete_supplier(db_session, supplier.ncc_id, hard_delete=True)
        assert exc_info.value.status_code == 400

        # Supplier row must still exist untouched — the delete was rejected
        # outright, not partially applied.
        still_there = db_session.query(NhaCungCap).filter(NhaCungCap.ncc_id == supplier.ncc_id).first()
        assert still_there is not None
        assert still_there.dang_hoat_dong is True


class TestUpdateSupplier:
    def test_rejects_ma_ncc_collision_with_another_supplier(self, db_session, service):
        a = service.create_supplier(db_session, _SupplierPayload("NCC A2", ma_ncc="NCC-A2"))
        service.create_supplier(db_session, _SupplierPayload("NCC B2", ma_ncc="NCC-B2"))

        with pytest.raises(DomainError) as exc_info:
            service.update_supplier(db_session, a.ncc_id, _SupplierUpdatePayload(ma_ncc="NCC-B2"))
        assert exc_info.value.status_code == 400
