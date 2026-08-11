"""Import the data/catalog_import/*.csv dataset into the LeafCreme DB.

Idempotent: matches on SKU (variant) / product SKU, never truncates or
deletes. Re-running is safe. Maps the CSV's richer schema (ingredients,
allergens, provenance, data_origin) onto the current SanPham/BienTheSanPham
tables, which don't have dedicated columns for most of that -- see
data/catalog_import/README.md section "Schema gap report" for what's
dropped on import and why nothing was silently added to models.py.

Usage:
    python scripts/import_catalog_dataset.py [--dry-run]
"""

from __future__ import annotations

import argparse
import csv
import io
import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal
from app.models import BienTheSanPham, SanPham

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "catalog_import"


def read_csv(name: str) -> list[dict]:
    with io.open(DATA_DIR / name, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def build_description(p: dict) -> str | None:
    """Fold provenance + flags the DB has no column for into mo_ta as a
    readable note, so the info isn't silently lost on import."""
    parts = []
    if p["data_origin"] == "synthetic":
        parts.append("[DEV SEED - SYNTHETIC PLACEHOLDER, chưa xác thực]")
    else:
        parts.append(f"Nguồn: {p['source']} ({p['source_url']})")
        if p["brand"]:
            parts.append(f"Thương hiệu gốc: {p['brand']}")
    if p["ingredients_status"] == "real" and p.get("_ingredients_text"):
        parts.append(f"Thành phần: {p['_ingredients_text']}")
    else:
        parts.append("Thành phần: CHƯA CÓ - cần bổ sung trước khi lên production.")
    if p["allergens"]:
        parts.append(f"Dị ứng (chưa xác thực nội bộ): {p['allergens']}")
    else:
        parts.append("Dị ứng: CHƯA XÁC THỰC - không dùng làm căn cứ an toàn thực phẩm.")
    if p["notes"]:
        parts.append(p["notes"])
    return " | ".join(parts)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print what would happen without writing to the DB")
    args = parser.parse_args()

    products = read_csv("products.csv")
    variants = read_csv("product_variants.csv")
    ingredients_by_product: dict[str, list[str]] = {}
    for row in read_csv("product_ingredients.csv"):
        ingredients_by_product.setdefault(row["product_id"], []).append(row["raw_text"])

    variants_by_product: dict[str, list[dict]] = {}
    for v in variants:
        variants_by_product.setdefault(v["product_id"], []).append(v)

    db = SessionLocal()
    created_products = 0
    created_variants = 0
    skipped_products = 0
    skipped_variants = 0
    try:
        for p in products:
            p["_ingredients_text"] = "; ".join(ingredients_by_product.get(p["id"], [])) or None
            product_sku = p["id"]  # internal catalog id doubles as the SanPham SKU

            existing = db.query(SanPham).filter(SanPham.sku == product_sku).first()
            if existing:
                skipped_products += 1
                sanpham = existing
            else:
                sanpham = SanPham(
                    ten=p["name"],
                    sku=product_sku,
                    loai="bien_the",
                    gia_co_ban=Decimal(variants_by_product.get(p["id"], [{"price": "0"}])[0]["price"] or "0"),
                    mo_ta=build_description(p),
                    hinh_anh_url=p["image_url"] or None,
                    danh_muc=p["category"],
                    don_vi_tinh="chiếc",
                    dang_hoat_dong=True,
                )
                if args.dry_run:
                    print(f"[dry-run] would create SanPham sku={product_sku} ten={p['name']!r}")
                else:
                    db.add(sanpham)
                    db.flush()
                created_products += 1

            for v in variants_by_product.get(p["id"], []):
                existing_variant = db.query(BienTheSanPham).filter(BienTheSanPham.sku_bienthe == v["sku"]).first()
                if existing_variant:
                    skipped_variants += 1
                    continue
                flavor_label = p["flavor"] or p["subcategory"]
                size_label = f"{v['size']} ({v['weight']}{v['weight_unit']})"
                if args.dry_run:
                    print(f"[dry-run] would create BienTheSanPham sku={v['sku']} size={size_label} price={v['price']}")
                    created_variants += 1
                    continue
                bienthe = BienTheSanPham(
                    sanpham_id=sanpham.sanpham_id,
                    huong_vi=flavor_label,
                    kich_thuoc=size_label,
                    gia_bienthe=Decimal(v["price"]),
                    sku_bienthe=v["sku"],
                    dang_hoat_dong=True,
                )
                db.add(bienthe)
                created_variants += 1

        if args.dry_run:
            db.rollback()
        else:
            db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print(f"Products created: {created_products}, skipped (already existed): {skipped_products}")
    print(f"Variants created: {created_variants}, skipped (already existed): {skipped_variants}")
    if args.dry_run:
        print("Dry run only - no changes were committed.")


if __name__ == "__main__":
    main()
