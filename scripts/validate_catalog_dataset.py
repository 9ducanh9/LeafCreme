"""Validate data/catalog_import/*.csv and print a data-quality report.

Usage:
    python scripts/validate_catalog_dataset.py
"""

from __future__ import annotations

import csv
import io
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "catalog_import"

VALID_CATEGORIES = {"Bánh kem", "Bông lan", "Mousse", "Tiramisu"}


def read_csv(name: str) -> list[dict]:
    with io.open(DATA_DIR / name, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main() -> None:
    products = read_csv("products.csv")
    variants = read_csv("product_variants.csv")

    issues: list[str] = []
    review: list[str] = []

    total = len(products)

    # Missing product names
    missing_name = [p["id"] for p in products if not p["name"].strip()]
    if missing_name:
        issues.append(f"Missing product name: {missing_name}")

    # Duplicate products (by slug)
    slug_counts = Counter(p["slug"] for p in products)
    dup_slugs = [s for s, c in slug_counts.items() if c > 1]
    if dup_slugs:
        issues.append(f"Duplicate slugs: {dup_slugs}")

    # Duplicate barcodes (real products should each have a unique barcode)
    barcodes = [p["barcode"] for p in products if p["barcode"]]
    dup_barcodes = [b for b, c in Counter(barcodes).items() if c > 1]
    if dup_barcodes:
        issues.append(f"Duplicate barcodes: {dup_barcodes}")

    # Invalid categories
    invalid_cat = [p["id"] for p in products if p["category"] not in VALID_CATEGORIES]
    if invalid_cat:
        issues.append(f"Category outside storefront taxonomy {VALID_CATEGORIES}: {invalid_cat}")

    # Missing images
    missing_images = [p["id"] for p in products if not p["image_url"]]

    # Missing ingredients / allergens (expected for synthetic rows -> review list, not hard error)
    missing_ingredients = [p["id"] for p in products if p["ingredients_status"] != "real"]
    missing_allergens = [p["id"] for p in products if p["allergens_status"] != "real"]

    # Variant-level checks
    dup_skus = [s for s, c in Counter(v["sku"] for v in variants).items() if c > 1]
    if dup_skus:
        issues.append(f"Duplicate variant SKUs: {dup_skus}")

    invalid_prices = [v["sku"] for v in variants if not v["price"] or float(v["price"]) <= 0]
    if invalid_prices:
        issues.append(f"Invalid/missing price: {invalid_prices}")

    invalid_sizes = [v["sku"] for v in variants if not v["size"].strip() or not v["weight"].strip()]
    if invalid_sizes:
        issues.append(f"Invalid/missing size or weight: {invalid_sizes}")

    products_without_variants = [p["id"] for p in products if p["id"] not in {v["product_id"] for v in variants}]
    if products_without_variants:
        issues.append(f"Products with no variants: {products_without_variants}")

    dup_variant_combo = Counter((v["product_id"], v["size"]) for v in variants)
    dup_variants = [k for k, c in dup_variant_combo.items() if c > 1]
    if dup_variants:
        issues.append(f"Duplicate (product,size) variant combos: {dup_variants}")

    synthetic_prices = [v["sku"] for v in variants if v["price_data_origin"] == "synthetic"]
    review.append(f"{len(synthetic_prices)} variant price(s) are synthetic placeholders, not sourced — needs Leaf Crème pricing review before production use.")
    review.append(f"{len(missing_ingredients)} product(s) missing real ingredients data: {missing_ingredients}")
    review.append(f"{len(missing_allergens)} product(s) with unverified/missing allergen data — DO NOT treat as allergen-safe: {missing_allergens}")

    valid_records = total - len({*missing_name, *dup_slugs, *invalid_cat})

    report_lines = [
        "# Leaf Creme catalog dataset — data quality report",
        "",
        f"Total records: {total}",
        f"Valid records (no hard-fail issues): {valid_records}",
        f"Duplicates (slug/barcode/sku): {len(dup_slugs) + len(dup_barcodes) + len(dup_skus)}",
        f"Missing images: {len(missing_images)} ({', '.join(missing_images) or 'none'})",
        f"Missing variants: {len(products_without_variants)}",
        f"Missing/invalid prices: {len(invalid_prices)}",
        f"Invalid categories: {len(invalid_cat)}",
        f"Records requiring review: {len(missing_ingredients) + len(missing_allergens)}",
        "",
        "## Hard-fail issues",
    ]
    report_lines += ([f"- {i}" for i in issues] or ["- none"])
    report_lines += ["", "## Requires manual review before production use"]
    report_lines += [f"- {r}" for r in review]

    report = "\n".join(report_lines)
    print(report)
    (DATA_DIR / "data_quality_report.md").write_text(report, encoding="utf-8")


if __name__ == "__main__":
    main()
