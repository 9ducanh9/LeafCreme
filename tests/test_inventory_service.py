"""Inventory allocation tests for FEFO and expiry safety."""

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest

from app.models import (
    BienTheSanPham,
    HopQua,
    LoHangHopQua,
    LoHangSanPham,
    SanPham,
    TonKhoHopQua,
    TonKhoSanPham,
)
from app.services.orders import DomainError
from app.services.orders.inventory_service import InventoryService


def _expiry(days_from_today: int) -> datetime:
    return datetime.combine(date.today() + timedelta(days=days_from_today), time.max)


def _suffix(label: str) -> str:
    return f"{label}-{uuid4().hex[:10]}"


def _make_product_lots(db_session):
    suffix = _suffix("inventory-product")
    product = SanPham(
        ten=f"Product {suffix}",
        sku=f"SKU-{suffix}",
        gia_co_ban=Decimal("100000"),
    )
    db_session.add(product)
    db_session.flush()

    variant = BienTheSanPham(
        sanpham_id=product.sanpham_id,
        huong_vi="Vanilla",
        gia_bienthe=Decimal("100000"),
    )
    db_session.add(variant)
    db_session.flush()

    lots = []
    for label, expiry, quantity in (
        ("expired", _expiry(-1), 9),
        ("today", _expiry(0), 1),
        ("future", _expiry(10), 4),
    ):
        lot = LoHangSanPham(
            bienthe_sanpham_id=variant.bienthe_id,
            ma_lo=f"LOT-{suffix}-{label}",
            ngay_het_han=expiry,
            so_luong=quantity,
            gia_don_vi=Decimal("50000"),
            trang_thai="hoatdong",
        )
        db_session.add(lot)
        db_session.flush()
        stock = TonKhoSanPham(
            lohang_sanpham_id=lot.lohang_id,
            so_luong_hien_tai=quantity,
        )
        db_session.add(stock)
        lots.append((label, lot))

    db_session.flush()
    return variant, lots


def _make_gift_box_lots(db_session):
    suffix = _suffix("inventory-gift")
    gift_box = HopQua(
        ten_hop_qua=f"Gift box {suffix}",
        sku=f"GIFT-{suffix}",
        gia_ban=Decimal("250000"),
    )
    db_session.add(gift_box)
    db_session.flush()

    lots = []
    for label, expiry, quantity in (
        ("expired", _expiry(-1), 5),
        ("today", _expiry(0), 1),
        ("future", _expiry(10), 3),
    ):
        lot = LoHangHopQua(
            hop_qua_id=gift_box.hop_qua_id,
            ma_lo=f"LOT-{suffix}-{label}",
            ngay_het_han=expiry,
            so_luong=quantity,
            gia_don_vi=Decimal("120000"),
            trang_thai="hoatdong",
        )
        db_session.add(lot)
        db_session.flush()
        db_session.add(
            TonKhoHopQua(
                lohang_hopqua_id=lot.lohang_id,
                so_luong_hien_tai=quantity,
            )
        )
        lots.append((label, lot))

    db_session.flush()
    return gift_box, lots


def test_product_allocation_skips_expired_lots_and_uses_fefo(db_session):
    variant, lots = _make_product_lots(db_session)

    allocations = InventoryService().allocate_variant(
        db_session,
        variant.bienthe_id,
        2,
        "Not enough product stock",
    )

    by_label = {label: lot.lohang_id for label, lot in lots}
    assert [allocation.batch_id for allocation in allocations] == [
        by_label["today"],
        by_label["future"],
    ]
    assert sum(allocation.quantity for allocation in allocations) == 2
    assert by_label["expired"] not in [allocation.batch_id for allocation in allocations]


def test_gift_box_allocation_skips_expired_lots(db_session):
    gift_box, lots = _make_gift_box_lots(db_session)

    allocations = InventoryService().allocate_gift_box(
        db_session,
        gift_box.hop_qua_id,
        2,
        "Not enough gift box stock",
    )

    by_label = {label: lot.lohang_id for label, lot in lots}
    assert [allocation.batch_id for allocation in allocations] == [
        by_label["today"],
        by_label["future"],
    ]
    assert by_label["expired"] not in [allocation.batch_id for allocation in allocations]


def test_expired_only_stock_is_unavailable(db_session):
    variant, lots = _make_product_lots(db_session)
    for label, lot in lots:
        if label != "expired":
            db_session.query(TonKhoSanPham).filter(
                TonKhoSanPham.lohang_sanpham_id == lot.lohang_id
            ).update({TonKhoSanPham.so_luong_hien_tai: 0})
    db_session.flush()

    with pytest.raises(DomainError):
        InventoryService().allocate_variant(
            db_session,
            variant.bienthe_id,
            1,
            "Not enough product stock",
        )
