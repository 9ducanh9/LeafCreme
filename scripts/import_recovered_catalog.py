"""Import data/catalog_import/products_recovered.csv + product_variants_recovered.csv
into the DB. See scripts/build_recovered_catalog.py for how this data was
reconstructed from the project's own lost catalog.

Idempotent: matches on SKU, never deletes. Safe to re-run.

Usage:
    python scripts/import_recovered_catalog.py [--dry-run]
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    products = read_csv("products_recovered.csv")
    variants = read_csv("product_variants_recovered.csv")
    variants_by_product: dict[str, list[dict]] = {}
    for v in variants:
        variants_by_product.setdefault(v["product_id"], []).append(v)

    db = SessionLocal()
    created_products = created_variants = skipped_products = skipped_variants = 0
    try:
        for p in products:
            existing = db.query(SanPham).filter(SanPham.sku == p["id"]).first()
            if existing:
                skipped_products += 1
                sanpham = existing
            else:
                mo_ta = f"{p['notes']} | Hương vị: {p['flavor']}"
                sanpham = SanPham(
                    ten=p["name"],
                    sku=p["id"],
                    loai="bien_the",
                    gia_co_ban=Decimal(variants_by_product[p["id"]][0]["price"]),
                    mo_ta=mo_ta,
                    hinh_anh_url=p["image_url"] or None,
                    danh_muc=p["category"],
                    don_vi_tinh="chiếc",
                    dang_hoat_dong=True,
                )
                if args.dry_run:
                    print(f"[dry-run] would create SanPham sku={p['id']} ten={p['name']!r} danh_muc={p['category']!r}")
                else:
                    db.add(sanpham)
                    db.flush()
                created_products += 1

            for v in variants_by_product.get(p["id"], []):
                existing_variant = db.query(BienTheSanPham).filter(BienTheSanPham.sku_bienthe == v["sku"]).first()
                if existing_variant:
                    skipped_variants += 1
                    continue
                if args.dry_run:
                    print(f"[dry-run] would create BienTheSanPham sku={v['sku']} size={v['size']} price={v['price']}")
                    created_variants += 1
                    continue
                db.add(BienTheSanPham(
                    sanpham_id=sanpham.sanpham_id,
                    huong_vi=p["flavor"],
                    kich_thuoc=v["size"],
                    gia_bienthe=Decimal(v["price"]),
                    sku_bienthe=v["sku"],
                    dang_hoat_dong=True,
                ))
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

    print(f"Products created: {created_products}, skipped: {skipped_products}")
    print(f"Variants created: {created_variants}, skipped: {skipped_variants}")
    if args.dry_run:
        print("Dry run only - no changes committed.")


if __name__ == "__main__":
    main()
