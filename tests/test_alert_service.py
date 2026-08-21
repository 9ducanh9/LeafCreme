"""
Tests for app.services.alerts.AlertService — Phase 1 service-layer
migration (see app/services/alerts/alert_service.py module docstring).

Focused on `generate_alerts`, the logic that was generalized across the
three batch kinds (was triplicated in the original router) — the highest
regression risk in this migration. Lighter coverage than payments/batches
since alerts are informational (no money, no inventory consumption).

"""
from datetime import datetime, timedelta
from decimal import Decimal

import pytest

from app.models import (
    BienTheSanPham,
    CanhBaoTonKho,
    LoHangSanPham,
    NguoiDung,
    SanPham,
    TonKhoSanPham,
    VaiTro,
)
from app.services.alerts import AlertService, DomainError
from app.routers.alerts import AlertSortField


@pytest.fixture()
def service() -> AlertService:
    return AlertService()


@pytest.fixture()
def admin_user(db_session):
    role = VaiTro(ten_vai_tro="admin")
    db_session.add(role)
    db_session.flush()
    user = NguoiDung(
        ten_dang_nhap="alert_admin",
        email="alert_admin@example.com",
        mat_khau_ma_hoa="hashed",
        vaitro_id=role.vaitro_id,
        ho_ten="Alert Admin",
    )
    db_session.add(user)
    db_session.flush()
    return user


def _make_product_batch(db_session, so_luong_hien_tai: int, ngay_het_han: datetime) -> LoHangSanPham:
    product = SanPham(ten="Bánh test alert", sku=f"SP-ALERT-{so_luong_hien_tai}-{ngay_het_han.timestamp()}", gia_co_ban=Decimal("50000"))
    db_session.add(product)
    db_session.flush()
    variant = BienTheSanPham(sanpham_id=product.sanpham_id, huong_vi="Vani", gia_bienthe=Decimal("50000"))
    db_session.add(variant)
    db_session.flush()
    batch = LoHangSanPham(
        bienthe_sanpham_id=variant.bienthe_id,
        ma_lo=f"LOT-ALERT-{variant.bienthe_id}",
        ngay_het_han=ngay_het_han,
        so_luong=so_luong_hien_tai,
        gia_don_vi=Decimal("50000"),
        trang_thai="hoatdong",
    )
    db_session.add(batch)
    db_session.flush()
    inventory = TonKhoSanPham(
        lohang_sanpham_id=batch.lohang_id,
        so_luong_hien_tai=so_luong_hien_tai,
        so_luong_da_ban=0,
    )
    db_session.add(inventory)
    db_session.flush()
    return batch


class TestGenerateAlerts:
    def test_creates_low_stock_alert(self, db_session, service):
        batch = _make_product_batch(db_session, so_luong_hien_tai=3, ngay_het_han=datetime.now() + timedelta(days=90))

        result = service.generate_alerts(db_session, low_stock_threshold=10, expiring_days=7)

        assert result["low_stock_created"] == 1
        alert = db_session.query(CanhBaoTonKho).filter(
            CanhBaoTonKho.lohang_sanpham_id == batch.lohang_id,
            CanhBaoTonKho.loai_canh_bao == "ton_kho_thap",
        ).first()
        assert alert is not None
        assert alert.muc_do_nghiem_trong == "cao"  # so_luong <= 5

    def test_creates_expiring_alert(self, db_session, service):
        batch = _make_product_batch(db_session, so_luong_hien_tai=50, ngay_het_han=datetime.now() + timedelta(days=3))

        result = service.generate_alerts(db_session, low_stock_threshold=10, expiring_days=7)

        assert result["expiring_created"] == 1
        alert = db_session.query(CanhBaoTonKho).filter(
            CanhBaoTonKho.lohang_sanpham_id == batch.lohang_id,
            CanhBaoTonKho.loai_canh_bao == "sap_het_han",
        ).first()
        assert alert is not None

    def test_creates_expired_alert_for_past_due_batch(self, db_session, service):
        batch = _make_product_batch(db_session, so_luong_hien_tai=50, ngay_het_han=datetime.now() - timedelta(days=1))

        result = service.generate_alerts(db_session, low_stock_threshold=10, expiring_days=7)

        assert result["expired_created"] == 1
        alert = db_session.query(CanhBaoTonKho).filter(
            CanhBaoTonKho.lohang_sanpham_id == batch.lohang_id,
            CanhBaoTonKho.loai_canh_bao == "qua_han",
        ).first()
        assert alert is not None

    def test_does_not_duplicate_alert_on_second_run(self, db_session, service):
        _make_product_batch(db_session, so_luong_hien_tai=3, ngay_het_han=datetime.now() + timedelta(days=90))

        first = service.generate_alerts(db_session, low_stock_threshold=10, expiring_days=7)
        second = service.generate_alerts(db_session, low_stock_threshold=10, expiring_days=7)

        assert first["low_stock_created"] == 1
        assert second["low_stock_created"] == 0

    def test_skips_batch_with_zero_stock(self, db_session, service):
        _make_product_batch(db_session, so_luong_hien_tai=0, ngay_het_han=datetime.now() + timedelta(days=90))

        result = service.generate_alerts(db_session, low_stock_threshold=10, expiring_days=7)
        assert result["total_created"] == 0


class TestUpdateAlert:
    def test_not_found_raises_404(self, db_session, service, admin_user):
        class Payload:
            trang_thai = "da_xu_ly"
            ghi_chu = None

        with pytest.raises(DomainError) as exc_info:
            service.update_alert(db_session, 999999, Payload(), admin_user)
        assert exc_info.value.status_code == 404

    def test_resolving_records_who_and_when(self, db_session, service, admin_user):
        batch = _make_product_batch(db_session, so_luong_hien_tai=3, ngay_het_han=datetime.now() + timedelta(days=90))
        service.generate_alerts(db_session, low_stock_threshold=10, expiring_days=7)
        alert = db_session.query(CanhBaoTonKho).filter(
            CanhBaoTonKho.lohang_sanpham_id == batch.lohang_id
        ).first()

        class Payload:
            trang_thai = "da_xu_ly"
            ghi_chu = "Đã nhập thêm hàng"

        result = service.update_alert(db_session, alert.canhbao_id, Payload(), admin_user)

        assert result["trang_thai"] == "da_xu_ly"
        assert result["nguoi_xu_ly"] == admin_user.nguoidung_id
        assert result["ngay_xu_ly"] is not None


class TestDeleteAlert:
    def test_not_found_raises_404(self, db_session, service):
        with pytest.raises(DomainError) as exc_info:
            service.delete_alert(db_session, 999999)
        assert exc_info.value.status_code == 404


def test_alert_sort_accepts_admin_table_timestamp_field(db_session, service):
    result = service.list_alerts(
        db_session,
        paginated=True,
        sort_by=AlertSortField.ngay_canh_bao.value,
    )

    assert result["items"] == []
    assert result["total"] == 0
