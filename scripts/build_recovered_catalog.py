"""Rebuild the Leaf Creme catalog from RECOVERED (not open-dataset) data.

Supersedes build_catalog_dataset.py's Open Food Facts approach. That approach
substituted foreign packaged retail goods (Mamie Nova, Carrefour, etc.) for
Leaf Creme's actual made-to-order cakes, because no open dataset covers a
real Vietnamese bakery's own recipe line. This script instead reconstructs
Leaf Creme's *own* lost catalog from artifacts still sitting in this repo:

- 20 product images already committed at uploads/product/1..20_*.jpg
  (downloaded by scripts/download_product_images.py back when these 20
  products existed in the DB -- see git commit 3b9931c). The DB rows were
  lost, but the images (already license-checked by that script/its README)
  were not.
- The exact product names, recovered from those filenames.
- The size/serving convention "S/M/L - Xcm (Y nguoi)", confirmed by the
  still-active scripts/seed_gift_boxes.py (find_bienthe_by_name parses
  exactly this format, and its PRODUCT_NAME_MAPPING references these exact
  product names -- that script has been silently failing to match any
  product since the catalog was lost).

What's still NOT recoverable: the original prices. Nothing in the repo
records them, so prices here are market-benchmarked estimates (see README),
explicitly flagged price_data_origin=synthetic, not a claim about what
Leaf Creme originally charged.

Usage:
    python scripts/build_recovered_catalog.py
"""

from __future__ import annotations

import csv
import json
import os
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UPLOADS_PRODUCT_DIR = ROOT / "uploads" / "product"
OUT_DIR = ROOT / "data" / "catalog_import"

# (old sanpham_id the image was downloaded for, display name, category, flavor)
RECOVERED_PRODUCTS = [
    (1, "Mousse chanh dây", "Mousse", "Chanh dây (Passion fruit)"),
    (2, "Mousse dâu tươi", "Mousse", "Dâu tươi (Fresh strawberry)"),
    (3, "Mousse matcha phô mai", "Mousse", "Matcha phô mai (Matcha cheese)"),
    (4, "Mousse chocolate đen", "Mousse", "Chocolate đen (Dark chocolate)"),
    (5, "Mousse việt quất", "Mousse", "Việt quất (Blueberry)"),
    (6, "Tiramisu classic coffee", "Tiramisu", "Coffee (Classic)"),
    (7, "Tiramisu cacao", "Tiramisu", "Cacao"),
    (8, "Tiramisu matcha", "Tiramisu", "Matcha"),
    (9, "Tiramisu dâu", "Tiramisu", "Dâu (Strawberry)"),
    (10, "Tiramisu oreo", "Tiramisu", "Oreo"),
    (11, "Bông lan trứng muối basic", "Bông lan", "Trứng muối (Salted egg)"),
    (12, "Bông lan trứng muối phô mai", "Bông lan", "Trứng muối phô mai (Salted egg cheese)"),
    (13, "Bông lan trứng muối sốt dầu trứng", "Bông lan", "Trứng muối sốt dầu trứng (Salted egg + egg-oil sauce)"),
    (14, "Bông lan bơ sữa trái cây", "Bông lan", "Bơ sữa trái cây (Buttermilk fruit)"),
    (15, "Bông lan bơ sữa chocolate chips", "Bông lan", "Bơ sữa chocolate chips (Buttermilk choc chip)"),
    (16, "Bánh kem vanilla trái cây", "Bánh kem", "Vanilla trái cây (Vanilla fruit)"),
    (17, "Bánh kem chocolate", "Bánh kem", "Chocolate"),
    (18, "Bánh kem red velvet", "Bánh kem", "Red velvet"),
    (19, "Bánh kem oreo", "Bánh kem", "Oreo"),
    (20, "Bánh kem tiramisu kem", "Bánh kem", "Tiramisu kem (Tiramisu cream)"),
]

# Market-benchmarked base prices (VND) per category at S/M/L, from real listed
# prices at Vietnamese bakeries (Tin Phat Bakery, Thu Huong Cake, Anh Thu,
# 4GsTexas -- see README sources). Not Leaf Creme's actual historical prices,
# which are unrecoverable.
CATEGORY_PRICE_BAND = {
    "Mousse": {"S": 190000, "M": 220000, "L": 340000},
    "Tiramisu": {"S": 170000, "M": 200000, "L": 310000},
    "Bông lan": {"S": 170000, "M": 200000, "L": 250000},
    "Bánh kem": {"S": 150000, "M": 250000, "L": 380000},
}
SIZE_SPECS = [
    ("S", 12, "2-3 người", 400),
    ("M", 14, "3-4 người", 550),
    ("L", 18, "6-8 người", 900),
]


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return re.sub(r"-{2,}", "-", text).strip("-")


@dataclass
class Product:
    id: str
    name: str
    slug: str
    category: str
    subcategory: str
    flavor: str
    image_url: str
    image_license_status: str
    data_origin: str
    notes: str
    variants: list["Variant"] = field(default_factory=list)


@dataclass
class Variant:
    sku: str
    product_id: str
    size: str
    weight: str
    weight_unit: str
    servings: str
    price: str
    price_currency: str
    price_data_origin: str


def find_image_file(old_id: int) -> str | None:
    prefix = f"{old_id}_"
    for fname in os.listdir(UPLOADS_PRODUCT_DIR):
        if fname.startswith(prefix) and fname[len(prefix):len(prefix) + 1].isalpha():
            # guard against e.g. "1_" matching "10_..." -- prefix already includes "_"
            return fname
    return None


def main() -> None:
    products: list[Product] = []
    missing_images = []

    for idx, (old_id, name, category, flavor) in enumerate(RECOVERED_PRODUCTS, start=1):
        fname = find_image_file(old_id)
        if not fname:
            missing_images.append(name)
        pid = f"LC-REC-{idx:04d}"
        prod = Product(
            id=pid,
            name=name,
            slug=slugify(name),
            category=category,
            subcategory=flavor.split(" (")[0],
            flavor=flavor,
            image_url=f"product/{fname}" if fname else "",
            image_license_status="cc-license-unsplash-pexels-see-download-script" if fname else "none",
            data_origin="recovered",
            notes=(
                "Tên + ảnh khôi phục từ dữ liệu gốc bị mất (ảnh đã tải sẵn bởi "
                "scripts/download_product_images.py, xem git 3b9931c; tên khớp "
                "PRODUCT_NAME_MAPPING trong scripts/seed_gift_boxes.py). "
                "Giá là ước lượng theo thị trường (xem README), KHÔNG phải giá gốc đã mất. "
                "Nguyên liệu/allergen chưa xác thực."
            ),
        )
        band = CATEGORY_PRICE_BAND[category]
        cat_prefix = {"Mousse": "MOU", "Tiramisu": "TIRA", "Bông lan": "BL", "Bánh kem": "BK"}[category]
        for size_code, cm, servings, grams in SIZE_SPECS:
            price = band[size_code]
            sku = f"{cat_prefix}-{idx:02d}-{size_code}"  # idx guarantees uniqueness; slug alone collided for similarly-named products
            prod.variants.append(Variant(
                sku=sku,
                product_id=pid,
                size=f"{size_code} - {cm}cm ({servings})",
                weight=str(grams),
                weight_unit="g",
                servings=servings,
                price=str(price),
                price_currency="VND",
                price_data_origin="synthetic",
            ))
        products.append(prod)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    product_fields = ["id", "name", "slug", "category", "subcategory", "flavor", "image_url", "image_license_status", "data_origin", "notes"]
    with (OUT_DIR / "products_recovered.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=product_fields)
        w.writeheader()
        for p in products:
            w.writerow({k: getattr(p, k) for k in product_fields})

    variant_fields = ["sku", "product_id", "size", "weight", "weight_unit", "servings", "price", "price_currency", "price_data_origin"]
    with (OUT_DIR / "product_variants_recovered.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=variant_fields)
        w.writeheader()
        for p in products:
            for v in p.variants:
                w.writerow({k: getattr(v, k) for k in variant_fields})

    json_out = []
    for p in products:
        d = p.__dict__.copy()
        d["variants"] = [v.__dict__ for v in p.variants]
        json_out.append(d)
    with (OUT_DIR / "products_recovered.json").open("w", encoding="utf-8") as f:
        json.dump(json_out, f, ensure_ascii=False, indent=2)

    print(f"products: {len(products)}")
    print(f"variants: {sum(len(p.variants) for p in products)}")
    print(f"missing images: {missing_images}")


if __name__ == "__main__":
    main()
