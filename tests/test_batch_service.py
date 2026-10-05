"""
Tests for app.services.batches.BatchService — Phase 1 service-layer
migration (see app/services/batches/batch_service.py module docstring).

Covers the generalized create/list/get/update CRUD across all three batch
kinds.

Two pre-existing per-kind inconsistencies were found while writing these
tests. One is fixed (and covered below), one is intentionally left as-is:
  - FIXED: only product batches validated ma_qr uniqueness at the app
    level. Component/gift-box batches didn't, but ma_qr has a DB-level
    UNIQUE constraint on all three tables regardless — so a duplicate
    ma_qr on those two kinds didn't silently succeed, it raised an
    unhandled IntegrityError that fell through to main.py's generic
    Exception handler as a bare 500 instead of a clean 400. All three
    kinds now run the same app-level check.
  - PRESERVED: only product batch search matches ma_qr as well as ma_lo.
    Component/gift-box search matches ma_lo only. See
    TestListBatchesSearch below.
"""
from decimal import Decimal
from datetime import datetime, timedelta

import pytest

from app.models import (
    BienTheSanPham,
    HopQua,
    LinhKien,
    NguoiDung,
    ProactiveInsight,
    SanPham,
    TonKhoLinhKien,
    TonKhoSanPham,
    VaiTro,
)
from app.services.batches import BatchService, DomainError


@pytest.fixture()
def service() -> BatchService:
    return BatchService()


@pytest.fixture()
def staff_user(db_session):
    role = VaiTro(ten_vai_tro="staff")
    db_session.add(role)
    db_session.flush()
    user = NguoiDung(
        ten_dang_nhap="batch_staff",
        email="batch_staff@example.com",
        mat_khau_ma_hoa="hashed",
        vaitro_id=role.vaitro_id,
        ho_ten="Batch Staff",
    )
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture()
def variant(db_session) -> BienTheSanPham:
    product = SanPham(ten="Bánh test", sku="SP-BATCH-TEST", gia_co_ban=Decimal("50000"))
    db_session.add(product)
    db_session.flush()
    v = BienTheSanPham(sanpham_id=product.sanpham_id, huong_vi="Vani", gia_bienthe=Decimal("50000"))
    db_session.add(v)
    db_session.flush()
    return v


@pytest.fixture()
def component(db_session) -> LinhKien:
    c = LinhKien(ten_linh_kien="Hộp giấy test", gia_don_vi=Decimal("2000"))
    db_session.add(c)
    db_session.flush()
    return c


@pytest.fixture()
def gift_box(db_session) -> HopQua:
    g = HopQua(ten_hop_qua="Hộp quà test", gia_ban=Decimal("150000"))
    db_session.add(g)
    db_session.flush()
    return g


def _future(days=30) -> datetime:
    return datetime.now() + timedelta(days=days)


def _past(days=1) -> datetime:
    return datetime.now() - timedelta(days=days)


def test_disposal_endpoint_requires_stock_permission(client, db_session):
    from app.core.security import create_access_token
    role = db_session.query(VaiTro).filter(VaiTro.ten_vai_tro == "customer").one()
    user = NguoiDung(ten_dang_nhap="disposal_customer", email="disposal@example.com",
        mat_khau_ma_hoa="hashed", vaitro_id=role.vaitro_id, ho_ten="Customer")
    db_session.add(user)
    db_session.flush()
    payload = {"expected_quantity": 1, "reason": "Expired stock"}
    response = client.post("/batches/products/1/dispose-expired", json=payload,
        headers={"Authorization": f"Bearer {create_access_token({'sub': user.nguoidung_id})}"})
    assert response.status_code == 403
    assert client.post("/batches/products/1/dispose-expired", json=payload).status_code == 401


@pytest.mark.parametrize("kind", ["products", "components", "gift_boxes"])
def test_disposal_preserves_batch_and_logs_once(db_session, service, staff_user, variant, component, gift_box, kind, monkeypatch):
    from app.models import LichSuKhoSanPham, LichSuKhoLinhKien, LichSuKhoHopQua
    monkeypatch.setattr("app.services.batches.batch_service._refresh_proactive_expiry_insights", lambda db: None)
    cfg = service._kind(kind)
    item = {"products": variant, "components": component, "gift_boxes": gift_box}[kind]
    batch = cfg.batch_model(**{
        cfg.item_fk_field: getattr(item, cfg.item_pk_field), "ma_lo": "DISPOSE-TEST",
        "ngay_het_han": _past(2), "so_luong": 10, "gia_don_vi": Decimal("1000"),
        "trang_thai": "hoatdong",
    })
    db_session.add(batch)
    db_session.flush()
    inventory = cfg.inventory_model(**{cfg.inventory_fk_field: batch.lohang_id,
        "so_luong_hien_tai": 7, cfg.sold_field: 3})
    db_session.add(inventory)
    db_session.flush()
    result = service.dispose_expired(db_session, kind, batch.lohang_id, 7, "Expired stock", staff_user)
    assert result["so_luong_hien_tai"] == 0
    assert result["so_luong"] == 10
    assert result[cfg.sold_field] == 3
    assert result["trang_thai"] == "hethan"
    ledger_model = {"products": LichSuKhoSanPham, "components": LichSuKhoLinhKien, "gift_boxes": LichSuKhoHopQua}[kind]
    entry = db_session.query(ledger_model).one()
    assert (entry.loai_giao_dich, entry.so_luong, entry.so_luong_truoc, entry.so_luong_sau) == ("xuat_huy", 7, 7, 0)
    assert entry.nguoidung_id == staff_user.nguoidung_id
    with pytest.raises(DomainError) as exc:
        service.dispose_expired(db_session, kind, batch.lohang_id, 7, "Expired stock", staff_user)
    assert exc.value.status_code == 409
    assert db_session.query(ledger_model).count() == 1


@pytest.mark.parametrize("days,quantity,reason,status", [(2, 7, "Expired", 400), (0, 7, "Expired", 400), (-2, 6, "Expired", 409), (-2, 7, "   ", 400)])
def test_disposal_rejects_unsafe_requests(db_session, service, staff_user, variant, days, quantity, reason, status):
    from app.models import LoHangSanPham, LichSuKhoSanPham
    batch = LoHangSanPham(bienthe_sanpham_id=variant.bienthe_id, ma_lo="SAFE-TEST",
        ngay_het_han=datetime.now() + timedelta(days=days), so_luong=10, gia_don_vi=Decimal("1000"))
    db_session.add(batch)
    db_session.flush()
    inventory = TonKhoSanPham(lohang_sanpham_id=batch.lohang_id, so_luong_hien_tai=7, so_luong_da_ban=3)
    db_session.add(inventory)
    db_session.commit()
    batch_id = batch.lohang_id
    with pytest.raises(DomainError) as exc:
        service.dispose_expired(db_session, "products", batch_id, quantity, reason, staff_user)
    assert exc.value.status_code == status
    assert service.get_batch(db_session, "products", batch_id)["so_luong_hien_tai"] == 7
    assert db_session.query(LichSuKhoSanPham).count() == 0


class _ProductBatchPayload:
    def __init__(
        self,
        bienthe_sanpham_id,
        ma_lo,
        so_luong=10,
        ma_qr=None,
        ngay_het_han=None,
        ncc_id=None,
        ngay_san_xuat=None,
        auto_expiry=False,
    ):
        self.bienthe_sanpham_id = bienthe_sanpham_id
        self.ncc_id = ncc_id
        self.ma_lo = ma_lo
        self.ngay_san_xuat = ngay_san_xuat or datetime.now()
        self.ngay_het_han = None if auto_expiry else (ngay_het_han or _future())
        self.so_luong = so_luong
        self.gia_don_vi = Decimal("50000")
        self.trang_thai = "hoatdong"
        self.ma_qr = ma_qr
        self.ghi_chu = None

    def model_dump(self):
        return {
            "bienthe_sanpham_id": self.bienthe_sanpham_id,
            "ncc_id": self.ncc_id,
            "ma_lo": self.ma_lo,
            "ngay_san_xuat": self.ngay_san_xuat,
            "ngay_het_han": self.ngay_het_han,
            "so_luong": self.so_luong,
            "gia_don_vi": self.gia_don_vi,
            "trang_thai": self.trang_thai,
            "ma_qr": self.ma_qr,
            "ghi_chu": self.ghi_chu,
        }


class _ComponentBatchPayload:
    def __init__(self, linh_kien_id, ma_lo, so_luong=10, ma_qr=None, ngay_het_han=None, ncc_id=None):
        self.linh_kien_id = linh_kien_id
        self.ncc_id = ncc_id
        self.ma_lo = ma_lo
        self.ngay_het_han = ngay_het_han or _future()
        self.so_luong = so_luong
        self.gia_don_vi = Decimal("2000")
        self.trang_thai = "hoatdong"
        self.ma_qr = ma_qr
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


class TestCreateBatch:
    def test_product_batch_generates_compact_lot_code_when_omitted(self, db_session, service, staff_user, variant):
        produced_at = datetime.now().replace(hour=9, minute=30, second=0, microsecond=0)
        payload = _ProductBatchPayload(
            variant.bienthe_id,
            None,
            ngay_san_xuat=produced_at,
            ngay_het_han=produced_at + timedelta(days=3),
        )

        result = service.create_batch(db_session, "products", payload, staff_user)

        assert result["ma_lo"] == f"SP-BATCH-TEST-{produced_at:%y%m%d}-01"

    def test_product_batch_increments_generated_lot_sequence(self, db_session, service, staff_user, variant):
        produced_at = datetime.now().replace(hour=9, minute=30, second=0, microsecond=0)
        for expected_sequence in ("01", "02"):
            result = service.create_batch(
                db_session,
                "products",
                _ProductBatchPayload(
                    variant.bienthe_id,
                    None,
                    ngay_san_xuat=produced_at,
                    ngay_het_han=produced_at + timedelta(days=3),
                ),
                staff_user,
            )
            assert result["ma_lo"] == f"SP-BATCH-TEST-{produced_at:%y%m%d}-{expected_sequence}"

    def test_product_batch_auto_calculates_expiry_from_product_shelf_life(
        self, db_session, service, staff_user, variant
    ):
        produced_at = datetime.now().replace(microsecond=0)
        variant.sanpham.han_su_dung_ngay = 3
        db_session.flush()
        payload = _ProductBatchPayload(
            variant.bienthe_id,
            "LOT-AUTO-EXPIRY",
            ngay_san_xuat=produced_at,
            auto_expiry=True,
        )

        result = service.create_batch(db_session, "products", payload, staff_user)

        assert result["ngay_san_xuat"] == produced_at
        assert result["ngay_het_han"] == produced_at + timedelta(days=3)

    def test_product_batch_manual_expiry_overrides_product_default(
        self, db_session, service, staff_user, variant
    ):
        produced_at = datetime.now().replace(microsecond=0)
        manual_expiry = produced_at + timedelta(days=7)
        variant.sanpham.han_su_dung_ngay = 3
        db_session.flush()
        payload = _ProductBatchPayload(
            variant.bienthe_id,
            "LOT-MANUAL-EXPIRY",
            ngay_san_xuat=produced_at,
            ngay_het_han=manual_expiry,
        )

        result = service.create_batch(db_session, "products", payload, staff_user)

        assert result["ngay_het_han"] == manual_expiry

    def test_product_batch_without_default_requires_manual_expiry(
        self, db_session, service, staff_user, variant
    ):
        payload = _ProductBatchPayload(
            variant.bienthe_id,
            "LOT-MISSING-EXPIRY",
            auto_expiry=True,
        )

        with pytest.raises(DomainError) as exc_info:
            service.create_batch(db_session, "products", payload, staff_user)

        assert exc_info.value.status_code == 400
        assert "chưa cấu hình hạn sử dụng" in exc_info.value.detail

    def test_product_batch_creates_inventory_and_ledger_entry(self, db_session, service, staff_user, variant):
        payload = _ProductBatchPayload(variant.bienthe_id, "LOT-001", so_luong=25)

        result = service.create_batch(db_session, "products", payload, staff_user)

        assert result["so_luong_hien_tai"] == 25
        assert result["so_luong_da_ban"] == 0

        inv = db_session.query(TonKhoSanPham).filter(
            TonKhoSanPham.lohang_sanpham_id == result["lohang_id"]
        ).first()
        assert inv is not None
        assert inv.so_luong_hien_tai == 25

    def test_new_near_expiry_batch_creates_proactive_insight_immediately(self, db_session, service, staff_user, variant, monkeypatch):
        monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
        payload = _ProductBatchPayload(
            variant.bienthe_id,
            "LOT-PROACTIVE-EXPIRY",
            so_luong=12,
            ngay_het_han=_future(days=2),
        )

        result = service.create_batch(db_session, "products", payload, staff_user)

        insight = db_session.query(ProactiveInsight).one()
        assert insight.trang_thai == "unread"
        assert insight.bang_chung["batch_id"] == result["lohang_id"]

    def test_rejects_unknown_item(self, db_session, service, staff_user):
        payload = _ProductBatchPayload(bienthe_sanpham_id=999999, ma_lo="LOT-002")

        with pytest.raises(DomainError) as exc_info:
            service.create_batch(db_session, "products", payload, staff_user)
        assert exc_info.value.status_code == 404

    def test_rejects_duplicate_ma_lo(self, db_session, service, staff_user, variant):
        service.create_batch(db_session, "products", _ProductBatchPayload(variant.bienthe_id, "LOT-DUP"), staff_user)

        with pytest.raises(DomainError) as exc_info:
            service.create_batch(db_session, "products", _ProductBatchPayload(variant.bienthe_id, "LOT-DUP"), staff_user)
        assert exc_info.value.status_code == 400

    def test_product_batch_rejects_duplicate_ma_qr(self, db_session, service, staff_user, variant):
        service.create_batch(
            db_session, "products",
            _ProductBatchPayload(variant.bienthe_id, "LOT-QR-1", ma_qr="QR-SHARED"),
            staff_user,
        )

        with pytest.raises(DomainError) as exc_info:
            service.create_batch(
                db_session, "products",
                _ProductBatchPayload(variant.bienthe_id, "LOT-QR-2", ma_qr="QR-SHARED"),
                staff_user,
            )
        assert exc_info.value.status_code == 400

    def test_rejects_past_expiry_date(self, db_session, service, staff_user, variant):
        payload = _ProductBatchPayload(variant.bienthe_id, "LOT-EXPIRED", ngay_het_han=_past())

        with pytest.raises(DomainError) as exc_info:
            service.create_batch(db_session, "products", payload, staff_user)
        assert exc_info.value.status_code == 400

    def test_rejects_unknown_supplier(self, db_session, service, staff_user, variant):
        payload = _ProductBatchPayload(variant.bienthe_id, "LOT-BADSUPPLIER", ncc_id=999999)

        with pytest.raises(DomainError) as exc_info:
            service.create_batch(db_session, "products", payload, staff_user)
        assert exc_info.value.status_code == 404

    def test_component_batch_rejects_duplicate_ma_qr(self, db_session, service, staff_user, component):
        service.create_batch(
            db_session, "components",
            _ComponentBatchPayload(component.linh_kien_id, "COMP-LOT-QR-1", ma_qr="COMP-QR-SHARED"),
            staff_user,
        )

        # Before the fix this hit a DB UNIQUE-constraint IntegrityError and
        # surfaced as a bare 500, not a clean DomainError — see module
        # docstring. This locks in the fixed behavior.
        with pytest.raises(DomainError) as exc_info:
            service.create_batch(
                db_session, "components",
                _ComponentBatchPayload(component.linh_kien_id, "COMP-LOT-QR-2", ma_qr="COMP-QR-SHARED"),
                staff_user,
            )
        assert exc_info.value.status_code == 400

    def test_component_batch_creates_inventory_with_correct_sold_field(self, db_session, service, staff_user, component):
        payload = _ComponentBatchPayload(component.linh_kien_id, "COMP-LOT-001", so_luong=100)

        result = service.create_batch(db_session, "components", payload, staff_user)

        assert result["so_luong_hien_tai"] == 100
        assert result["so_luong_da_su_dung"] == 0
        assert "so_luong_da_ban" not in result  # components use a different field name

        inv = db_session.query(TonKhoLinhKien).filter(
            TonKhoLinhKien.lohang_linhkien_id == result["lohang_id"]
        ).first()
        assert inv.so_luong_da_su_dung == 0


class TestListBatchesSearch:
    def test_product_search_matches_ma_qr(self, db_session, service, staff_user, variant):
        service.create_batch(
            db_session, "products",
            _ProductBatchPayload(variant.bienthe_id, "LOT-SEARCH-1", ma_qr="FINDME-QR"),
            staff_user,
        )

        results = service.list_batches(db_session, "products", search="FINDME-QR")
        assert results["total"] == 1
        assert len(results["items"]) == 1

    def test_component_search_does_not_match_ma_qr(self, db_session, service, staff_user, component):
        service.create_batch(
            db_session, "components",
            _ComponentBatchPayload(component.linh_kien_id, "COMP-LOT-SEARCH", ma_qr="FINDME-QR-2"),
            staff_user,
        )

        # Searching by the QR code should NOT find it for components — only
        # ma_lo is searched for this kind (existing behavior, preserved).
        results = service.list_batches(db_session, "components", search="FINDME-QR-2")
        assert results["total"] == 0
        assert results["items"] == []

        results_by_lo = service.list_batches(db_session, "components", search="COMP-LOT-SEARCH")
        assert results_by_lo["total"] == 1
        assert len(results_by_lo["items"]) == 1


class TestUpdateBatch:
    def test_rejects_expiry_before_ngay_nhap(self, db_session, service, staff_user, variant):
        created = service.create_batch(db_session, "products", _ProductBatchPayload(variant.bienthe_id, "LOT-UPD-1"), staff_user)

        class UpdatePayload:
            def model_dump(self, exclude_unset=True):
                return {"ngay_het_han": _past()}

        with pytest.raises(DomainError) as exc_info:
            service.update_batch(db_session, "products", created["lohang_id"], UpdatePayload())
        assert exc_info.value.status_code == 400


class TestGetBatch:
    def test_not_found_raises_404(self, db_session, service):
        with pytest.raises(DomainError) as exc_info:
            service.get_batch(db_session, "products", 999999)
        assert exc_info.value.status_code == 404
