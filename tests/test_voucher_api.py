from datetime import timedelta
from decimal import Decimal

from app.core.time import utc_now
from app.models import PhieuGiamGia
from app.routers.vouchers import VoucherCreate, VoucherUpdate
from app.services.errors import DomainError
from app.services.vouchers import VoucherService


def test_public_active_voucher_endpoint_does_not_require_admin(client, db_session):
    now = utc_now()
    db_session.add_all(
        [
            PhieuGiamGia(
                ma_phieu="PUBLIC-ACTIVE",
                ten_phieu="Public active voucher",
                loai_giam="sotien",
                gia_tri_giam=Decimal("10000"),
                ngay_bat_dau=now - timedelta(days=1),
                ngay_het_han=now + timedelta(days=1),
                gioi_han_su_dung=0,
                so_lan_da_dung=0,
                dang_hoat_dong=True,
            ),
            PhieuGiamGia(
                ma_phieu="PUBLIC-EXPIRED",
                ten_phieu="Expired voucher",
                loai_giam="sotien",
                gia_tri_giam=Decimal("10000"),
                ngay_bat_dau=now - timedelta(days=2),
                ngay_het_han=now - timedelta(minutes=1),
                gioi_han_su_dung=0,
                so_lan_da_dung=0,
                dang_hoat_dong=True,
            ),
            PhieuGiamGia(
                ma_phieu="PUBLIC-USED-UP",
                ten_phieu="Exhausted voucher",
                loai_giam="sotien",
                gia_tri_giam=Decimal("10000"),
                ngay_bat_dau=now - timedelta(days=1),
                ngay_het_han=now + timedelta(days=1),
                gioi_han_su_dung=1,
                so_lan_da_dung=1,
                dang_hoat_dong=True,
            ),
        ]
    )
    db_session.flush()

    response = client.get("/vouchers/active")

    assert response.status_code == 200, response.text
    assert [row["ma_phieu"] for row in response.json()] == ["PUBLIC-ACTIVE"]


def test_voucher_update_rejects_invalid_percent_before_commit(db_session):
    voucher = VoucherService().create(
        db_session,
        VoucherCreate(
            ma_phieu="PERCENT-VALID",
            ten_phieu="Percent voucher",
            loai_giam="phantram",
            gia_tri_giam=Decimal("50"),
            ngay_bat_dau=utc_now() - timedelta(days=1),
            ngay_het_han=utc_now() + timedelta(days=1),
            gioi_han_su_dung=0,
            dang_hoat_dong=True,
        ),
    )

    try:
        VoucherService().update(db_session, voucher.phieugiam_id, VoucherUpdate(gia_tri_giam=Decimal("101")))
    except DomainError as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected invalid percent discount to be rejected")

    db_session.rollback()
    persisted = db_session.get(PhieuGiamGia, voucher.phieugiam_id)
    assert persisted is not None
    assert persisted.gia_tri_giam == Decimal("50")
