"""Deterministic catalog-level stock condition detector.

The detector owns objective inventory states. It includes active variants that
have never had a batch, which the legacy per-batch alert scan cannot see. The
Operations Agent may prioritize or explain these conditions, but it does not
decide whether a product is available.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.models import BienTheSanPham, LoHangSanPham, SanPham, TonKhoSanPham


PRODUCT_STOCK_ALERT_TYPE = "san_pham_can_nhap"
PRODUCT_STOCK_STATUSES = frozenset({
    "never_stocked",
    "out_of_stock",
    "partial_out_of_stock",
    "low_stock",
})


def _variant_label(variant: BienTheSanPham) -> str:
    # Flavor is already part of the product title in the current catalog.
    return (variant.kich_thuoc or "Mặc định").strip()


def detect_product_stock_conditions(db: Session) -> list[dict[str, Any]]:
    """Return one current condition per affected active product.

    Sellable stock follows the public availability endpoint: active,
    non-expired batches with positive inventory. Detection is product-level,
    while evidence retains the affected sizes for staff action.
    """
    products = (
        db.query(SanPham)
        .filter(SanPham.dang_hoat_dong.is_(True))
        .order_by(SanPham.sanpham_id.asc())
        .all()
    )
    if not products:
        return []

    variants = (
        db.query(BienTheSanPham)
        .filter(
            BienTheSanPham.sanpham_id.in_([product.sanpham_id for product in products]),
            BienTheSanPham.dang_hoat_dong.is_(True),
        )
        .order_by(BienTheSanPham.sanpham_id.asc(), BienTheSanPham.bienthe_id.asc())
        .all()
    )
    variants_by_product: dict[int, list[BienTheSanPham]] = defaultdict(list)
    for variant in variants:
        variants_by_product[variant.sanpham_id].append(variant)

    batches_by_variant: dict[int, list[tuple[LoHangSanPham, TonKhoSanPham | None]]] = defaultdict(list)
    if variants:
        batch_rows = (
            db.query(LoHangSanPham, TonKhoSanPham)
            .outerjoin(TonKhoSanPham, TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id)
            .filter(LoHangSanPham.bienthe_sanpham_id.in_([variant.bienthe_id for variant in variants]))
            .all()
        )
        for batch, inventory in batch_rows:
            batches_by_variant[batch.bienthe_sanpham_id].append((batch, inventory))

    today = date.today()
    conditions: list[dict[str, Any]] = []
    for product in products:
        product_variants = variants_by_product.get(product.sanpham_id, [])
        if not product_variants:
            continue

        size_rows: list[dict[str, Any]] = []
        for variant in product_variants:
            batch_rows = batches_by_variant.get(variant.bienthe_id, [])
            available = 0
            for batch, inventory in batch_rows:
                expiry = batch.ngay_het_han.date() if batch.ngay_het_han else None
                if (
                    batch.trang_thai == "hoatdong"
                    and expiry is not None
                    and expiry >= today
                    and inventory is not None
                    and (inventory.so_luong_hien_tai or 0) > 0
                ):
                    available += int(inventory.so_luong_hien_tai or 0)

            size_rows.append({
                "variant_id": variant.bienthe_id,
                "size": _variant_label(variant),
                "available": available,
                "threshold": int(variant.muc_gioi_han_ton or 10),
                "has_batch_history": bool(batch_rows),
            })

        total_available = sum(row["available"] for row in size_rows)
        sellable_count = sum(1 for row in size_rows if row["available"] > 0)
        missing = [row for row in size_rows if row["available"] == 0]
        low = [row for row in size_rows if 0 < row["available"] <= row["threshold"]]

        if all(not row["has_batch_history"] for row in size_rows):
            status = "never_stocked"
            severity = "cao"
        elif sellable_count == 0:
            status = "out_of_stock"
            severity = "cao"
        elif missing:
            status = "partial_out_of_stock"
            severity = "binh_thuong"
        elif low:
            status = "low_stock"
            severity = "binh_thuong"
        else:
            continue

        conditions.append({
            "product_id": product.sanpham_id,
            "product": product.ten,
            "category": product.danh_muc,
            "status": status,
            "severity": severity,
            "variant_count": len(size_rows),
            "sellable_variant_count": sellable_count,
            "total_available": total_available,
            "missing_sizes": [row["size"] for row in missing],
            "low_sizes": [
                {"size": row["size"], "available": row["available"], "threshold": row["threshold"]}
                for row in low
            ],
            "sizes": size_rows,
        })

    severity_rank = {"cao": 0, "binh_thuong": 1, "thap": 2}
    status_rank = {"never_stocked": 0, "out_of_stock": 1, "partial_out_of_stock": 2, "low_stock": 3}
    conditions.sort(key=lambda row: (
        severity_rank.get(row["severity"], 3),
        status_rank.get(row["status"], 4),
        row["product"].casefold(),
    ))
    return conditions


def build_product_stock_digest(db: Session) -> dict[str, Any]:
    conditions = detect_product_stock_conditions(db)
    categories: dict[str, int] = defaultdict(int)
    for condition in conditions:
        categories[condition.get("category") or "Chưa phân loại"] += 1

    return {
        "products": conditions,
        "product_count": len(conditions),
        "affected_size_count": sum(
            len(condition["missing_sizes"]) + len(condition["low_sizes"])
            for condition in conditions
        ),
        "unavailable_product_count": sum(
            condition["status"] in {"never_stocked", "out_of_stock"}
            for condition in conditions
        ),
        "never_stocked_count": sum(condition["status"] == "never_stocked" for condition in conditions),
        "out_of_stock_count": sum(condition["status"] == "out_of_stock" for condition in conditions),
        "partial_out_of_stock_count": sum(
            condition["status"] == "partial_out_of_stock" for condition in conditions
        ),
        "low_stock_count": sum(condition["status"] == "low_stock" for condition in conditions),
        "categories": dict(sorted(categories.items())),
    }
