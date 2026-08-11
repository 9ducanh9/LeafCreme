"""Phase 7a pagination contracts.

These are database-backed when TEST_DATABASE_URL/DATABASE_URL is configured;
the shared fixture skips them in a checkout without Postgres.
"""

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from uuid import uuid4

from app.models import BienTheSanPham, LoHangSanPham, SanPham, TonKhoSanPham
from app.services.batches import BatchService
from app.services.products import ProductService


def test_pagination_khong_trung_khong_mat_dong(db_session):
    suffix = uuid4().hex[:10]
    product = SanPham(ten=f"Pagination {suffix}", sku=f"PAG-{suffix}", gia_co_ban=Decimal("1000"))
    db_session.add(product)
    db_session.flush()
    variant = BienTheSanPham(sanpham_id=product.sanpham_id, huong_vi="Test", gia_bienthe=Decimal("1000"))
    db_session.add(variant)
    db_session.flush()
    expiry = datetime.combine(date.today() + timedelta(days=30), time.max)
    for index in range(100):
        batch = LoHangSanPham(
            bienthe_sanpham_id=variant.bienthe_id,
            ma_lo=f"PAG-{suffix}-{index}",
            ngay_het_han=expiry,
            so_luong=1,
            gia_don_vi=Decimal("100"),
            trang_thai="hoatdong",
        )
        db_session.add(batch)
        db_session.flush()
        db_session.add(TonKhoSanPham(lohang_sanpham_id=batch.lohang_id, so_luong_hien_tai=1))
    db_session.flush()

    service = BatchService()
    seen = []
    for skip in (0, 25, 50, 75):
        page = service.list_batches(
            db_session,
            "products",
            skip=skip,
            limit=25,
            item_id=variant.bienthe_id,
            sort_by="ngay_het_han",
            sort_dir="asc",
        )
        assert page["total"] == 100
        seen.extend(item["lohang_id"] for item in page["items"])
    assert len(seen) == 100
    assert len(set(seen)) == 100


def test_backward_not_paginated_contract(db_session):
    suffix = uuid4().hex[:10]
    product = SanPham(ten=f"Backward {suffix}", sku=f"BACK-{suffix}", gia_co_ban=Decimal("1000"))
    db_session.add(product)
    db_session.flush()
    service = ProductService()
    legacy = service.list_products(db_session, search=suffix)
    paginated = service.list_products(db_session, search=suffix, paginated=True)
    assert isinstance(legacy, list)
    assert isinstance(paginated, dict)
    assert paginated["items"]
