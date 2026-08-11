"""
Tests for app.services.inventory_trace.InventoryTraceService — Phase 1
service-layer migration (see app/services/inventory_trace/inventory_trace_service.py).

Batches are created via BatchService rather than raw ORM inserts, since
BatchService.create_batch already writes the matching "nhap_hang" ledger
row as a side effect (see InventoryLedgerService) — that gives realistic
ledger fixtures for free and exercises the two services together the way
production actually does.
"""
from decimal import Decimal

import pytest

from app.models import (
    BienTheSanPham,
    ChiTietDonHang,
    DonHang,
    LinhKien,
    NguoiDung,
    PhanBoChiTietDonHang,
    SanPham,
    VaiTro,
)
from app.services.batches import BatchService
from app.services.inventory_trace import DomainError, InventoryTraceService


@pytest.fixture()
def service() -> InventoryTraceService:
    return InventoryTraceService()


@pytest.fixture()
def batch_service() -> BatchService:
    return BatchService()


@pytest.fixture()
def staff_user(db_session):
    role = VaiTro(ten_vai_tro="trace_staff")
    db_session.add(role)
    db_session.flush()
    user = NguoiDung(
        ten_dang_nhap="trace_staff",
        email="trace_staff@example.com",
        mat_khau_ma_hoa="hashed",
        vaitro_id=role.vaitro_id,
        ho_ten="Trace Staff",
    )
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture()
def variant(db_session) -> BienTheSanPham:
    product = SanPham(ten="Bánh trace test", sku="SP-TRACE-TEST", gia_co_ban=Decimal("50000"))
    db_session.add(product)
    db_session.flush()
    v = BienTheSanPham(sanpham_id=product.sanpham_id, huong_vi="Sen", gia_bienthe=Decimal("50000"))
    db_session.add(v)
    db_session.flush()
    return v


@pytest.fixture()
def component(db_session) -> LinhKien:
    c = LinhKien(ten_linh_kien="Hộp giấy trace test", gia_don_vi=Decimal("2000"))
    db_session.add(c)
    db_session.flush()
    return c


class _ProductBatchPayload:
    def __init__(self, bienthe_sanpham_id, ma_lo, so_luong=10):
        from datetime import datetime, timedelta

        self.bienthe_sanpham_id = bienthe_sanpham_id
        self.ncc_id = None
        self.ma_lo = ma_lo
        self.ngay_het_han = datetime.now() + timedelta(days=30)
        self.so_luong = so_luong
        self.gia_don_vi = Decimal("50000")
        self.trang_thai = "hoatdong"
        self.ma_qr = None
        self.ghi_chu = None

    def model_dump(self):
        return {
            "bienthe_sanpham_id": self.bienthe_sanpham_id,
            "ncc_id": self.ncc_id,
            "ma_lo": self.ma_lo,
            "ngay_het_han": self.ngay_het_han,
            "so_luong": self.so_luong,
            "gia_don_vi": self.gia_don_vi,
            "trang_thai": self.trang_thai,
            "ma_qr": self.ma_qr,
            "ghi_chu": self.ghi_chu,
        }


class _ComponentBatchPayload:
    def __init__(self, linh_kien_id, ma_lo, so_luong=10):
        from datetime import datetime, timedelta

        self.linh_kien_id = linh_kien_id
        self.ncc_id = None
        self.ma_lo = ma_lo
        self.ngay_het_han = datetime.now() + timedelta(days=30)
        self.so_luong = so_luong
        self.gia_don_vi = Decimal("2000")
        self.trang_thai = "hoatdong"
        self.ma_qr = None
        self.ghi_chu = None

    def model_dump(self):
        return {
            "linh_kien_id": self.linh_kien_id,
            "ncc_id": self.ncc_id,
            "ma_lo": self.ma_lo,
            "ngay_het_han": self.ngay_het_han,
            "so_luong": self.so_luong,
            "gia_don_vi": self.gia_don_vi,
            "trang_thai": self.trang_thai,
            "ma_qr": self.ma_qr,
            "ghi_chu": self.ghi_chu,
        }


class TestGetInventoryLedger:
    def test_filters_by_item_type(self, db_session, service, batch_service, staff_user, variant, component):
        batch_service.create_batch(db_session, "products", _ProductBatchPayload(variant.bienthe_id, "LOT-TRACE-1"), staff_user)
        batch_service.create_batch(db_session, "components", _ComponentBatchPayload(component.linh_kien_id, "COMP-TRACE-1"), staff_user)

        product_rows = service.get_inventory_ledger(db_session, item_type="sanpham")
        assert all(row["item_type"] == "sanpham" for row in product_rows["items"])
        assert product_rows["total"] == 1

        component_rows = service.get_inventory_ledger(db_session, item_type="linhkien")
        assert all(row["item_type"] == "linhkien" for row in component_rows["items"])
        assert component_rows["total"] == 1

    def test_no_item_type_merges_and_sorts_all_kinds_by_recency(self, db_session, service, batch_service, staff_user, variant, component):
        batch_service.create_batch(db_session, "products", _ProductBatchPayload(variant.bienthe_id, "LOT-TRACE-2"), staff_user)
        batch_service.create_batch(db_session, "components", _ComponentBatchPayload(component.linh_kien_id, "COMP-TRACE-2"), staff_user)

        rows = service.get_inventory_ledger(db_session)
        item_types = {row["item_type"] for row in rows["items"]}
        assert {"sanpham", "linhkien"}.issubset(item_types)
        # Descending by timestamp.
        timestamps = [row["timestamp"] for row in rows["items"]]
        assert timestamps == sorted(timestamps, reverse=True)

    def test_filters_by_batch_id(self, db_session, service, batch_service, staff_user, variant):
        b1 = batch_service.create_batch(db_session, "products", _ProductBatchPayload(variant.bienthe_id, "LOT-TRACE-3A"), staff_user)
        batch_service.create_batch(db_session, "products", _ProductBatchPayload(variant.bienthe_id, "LOT-TRACE-3B"), staff_user)

        rows = service.get_inventory_ledger(db_session, item_type="sanpham", batch_id=b1["lohang_id"])
        assert rows["total"] == 1
        assert rows["items"][0]["batch_id"] == b1["lohang_id"]

    def test_pagination_skip_and_limit(self, db_session, service, batch_service, staff_user, variant):
        for i in range(5):
            batch_service.create_batch(db_session, "products", _ProductBatchPayload(variant.bienthe_id, f"LOT-TRACE-PAGE-{i}"), staff_user)

        page1 = service.get_inventory_ledger(db_session, item_type="sanpham", skip=0, limit=2)
        page2 = service.get_inventory_ledger(db_session, item_type="sanpham", skip=2, limit=2)
        assert len(page1["items"]) == 2
        assert len(page2["items"]) == 2
        assert page1["total"] == page2["total"] == 5
        assert {r["ledger_id"] for r in page1["items"]}.isdisjoint({r["ledger_id"] for r in page2["items"]})


class TestGetBatchTrace:
    def test_rejects_invalid_batch_type(self, db_session, service):
        with pytest.raises(DomainError) as exc_info:
            service.get_batch_trace(db_session, "not-a-real-type", 1)
        assert exc_info.value.status_code == 400

    def test_raises_404_for_missing_batch(self, db_session, service):
        with pytest.raises(DomainError) as exc_info:
            service.get_batch_trace(db_session, "sanpham", 999999)
        assert exc_info.value.status_code == 404

    def test_combines_metadata_movements_and_allocations(self, db_session, service, batch_service, staff_user, variant):
        batch = batch_service.create_batch(db_session, "products", _ProductBatchPayload(variant.bienthe_id, "LOT-TRACE-4", so_luong=20), staff_user)
        batch_id = batch["lohang_id"]

        order = DonHang(ma_don_hang="ORD-TRACE-1", tien_thanh_toan=Decimal("100000"))
        db_session.add(order)
        db_session.flush()

        item = ChiTietDonHang(
            donhang_id=order.donhang_id,
            lohang_sanpham_id=batch_id,
            so_luong=3,
            gia_don_vi=Decimal("50000"),
            tong_tien_phu=Decimal("150000"),
        )
        db_session.add(item)
        db_session.flush()

        allocation = PhanBoChiTietDonHang(
            chitiet_id=item.chitiet_id,
            loai_lohang="sanpham",
            lohang_sanpham_id=batch_id,
            so_luong=3,
        )
        db_session.add(allocation)
        db_session.flush()

        result = service.get_batch_trace(db_session, "sanpham", batch_id)

        assert result["batch"]["batch_id"] == batch_id
        assert result["batch"]["item_name"] == "Bánh trace test"
        assert len(result["movements"]) == 1
        assert result["movements"][0]["movement_type"] == "nhap_hang"
        assert len(result["allocations"]) == 1
        assert result["allocations"][0]["order_id"] == order.donhang_id
        assert result["allocations"][0]["quantity"] == 3
