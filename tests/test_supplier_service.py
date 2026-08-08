"""
Tests for app.services.suppliers.SupplierService — Phase 1 service-layer
migration (see app/services/suppliers/supplier_service.py).
"""
import pytest

from app.models import NhaCungCap
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
            ten_ncc=None, ma_ncc=None, nguoi_lien_he=None, so_dien_thoai=None,
            email=None, dia_chi=None, thong_tin_thanh_toan=None, ghi_chu=None, dang_hoat_dong=None,
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


class TestUpdateSupplier:
    def test_rejects_ma_ncc_collision_with_another_supplier(self, db_session, service):
        a = service.create_supplier(db_session, _SupplierPayload("NCC A2", ma_ncc="NCC-A2"))
        service.create_supplier(db_session, _SupplierPayload("NCC B2", ma_ncc="NCC-B2"))

        with pytest.raises(DomainError) as exc_info:
            service.update_supplier(db_session, a.ncc_id, _SupplierUpdatePayload(ma_ncc="NCC-B2"))
        assert exc_info.value.status_code == 400
