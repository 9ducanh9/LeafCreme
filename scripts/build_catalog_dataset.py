"""Build the Leaf Creme product catalog seed dataset.

Combines two kinds of data, both explicitly labeled via ``data_origin``:

1. REAL records pulled from the Open Food Facts API (ODbL 1.0) for the two
   storefront categories that genuinely exist as packaged retail goods —
   Tiramisu and Bong lan (sponge/pound cake). Raw API snapshots are kept in
   data/catalog_import/raw/ for provenance/reproducibility.
2. SYNTHETIC placeholder records for Banh kem and Mousse — Leaf Creme's core
   made-to-order cream-cake business. No open dataset anywhere publishes a
   real bakery's whole-cake price list (see data/catalog_import/README.md),
   so these exist only to give the dev/staging DB non-empty rows in every
   storefront category, and every fabricated field (price, ingredients,
   allergens) is left explicitly missing or flagged rather than invented.

Usage:
    python scripts/build_catalog_dataset.py

Writes CSV/JSON output to data/catalog_import/.
"""

from __future__ import annotations

import csv
import json
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "catalog_import" / "raw"
OUT_DIR = ROOT / "data" / "catalog_import"

OFF_ATTRIBUTION = (
    "Data from Open Food Facts (https://world.openfoodfacts.org), "
    "licensed under the Open Database License (ODbL) 1.0. "
    "Attribution + share-alike required for redistribution."
)

ALLERGEN_VI = {
    "en:gluten": "Gluten",
    "en:milk": "Sữa",
    "en:eggs": "Trứng",
    "en:soybeans": "Đậu nành",
    "en:nuts": "Hạt cây",
    "en:peanuts": "Đậu phộng",
    "en:sesame-seeds": "Mè",
    "en:celery": "Cần tây",
    "en:mustard": "Mù tạt",
    "en:sulphur-dioxide-and-sulphites": "Sulfit",
    "en:lupin": "Đậu lupin",
    "en:fish": "Cá",
    "en:crustaceans": "Giáp xác",
    "en:molluscs": "Nhuyễn thể",
}


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return re.sub(r"-{2,}", "-", text).strip("-")


def split_top_level(text: str, sep: str = ",") -> list[str]:
    """Split on `sep` but only at bracket depth 0 (handles nested (), [], _..._)."""
    parts: list[str] = []
    depth = 0
    buf: list[str] = []
    for ch in text:
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth = max(0, depth - 1)
        if ch == sep and depth == 0:
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    if buf:
        parts.append("".join(buf))
    return [p.strip() for p in parts if p.strip()]


def clean_ingredient_name(raw: str) -> str:
    name = raw
    name = re.sub(r"\(.*?\)", "", name)  # drop parenthetical sub-ingredients
    name = re.sub(r"\[.*?\]", "", name)
    name = name.replace("_", "")
    name = re.sub(r"\d+([.,]\d+)?\s*%", "", name)  # drop percentages
    name = re.sub(r"\s{2,}", " ", name).strip(" .;:-")
    return name.strip()


@dataclass
class Product:
    id: str
    name: str
    slug: str
    category: str
    subcategory: str
    description: str | None
    flavor: str | None
    filling: str | None
    ingredients_status: str  # real | missing
    ingredients_raw: str | None
    allergens: str
    allergens_status: str  # real | missing_unverified
    tags: str
    image_url: str | None
    image_license_status: str
    barcode: str | None
    brand: str | None
    source: str
    source_url: str | None
    source_product_id: str | None
    data_origin: str  # real | synthetic
    license: str
    notes: str
    variants: list["Variant"] = field(default_factory=list)


@dataclass
class Variant:
    sku: str
    product_id: str
    size: str
    size_unit: str
    weight: str
    weight_unit: str
    servings: str
    servings_status: str  # real | missing | estimated
    price: str
    price_currency: str
    price_data_origin: str  # synthetic (no source in this dataset has real bakery prices)
    data_origin: str


def load_off(filename: str) -> list[dict]:
    with (RAW_DIR / filename).open(encoding="utf-8") as f:
        data = json.load(f)
    return data.get("products", [])


NAME_EXCLUDE_KEYWORDS = ("compote", "purée", "puree", "sauce", "confiture", "jam")


def is_complete(p: dict) -> bool:
    return bool(
        p.get("product_name")
        and (p.get("image_front_url") or p.get("image_url"))
        and (p.get("product_quantity") and p.get("product_quantity_unit"))
        and p.get("ingredients_text")
        and p.get("code")
    )


def matches_category(name: str, category_tag_keyword: str | None) -> bool:
    low = name.lower()
    if any(bad in low for bad in NAME_EXCLUDE_KEYWORDS):
        return False
    if category_tag_keyword and category_tag_keyword not in low:
        return False
    return True


FLAVOR_HINTS = [
    ("chocolat", "Chocolate"), ("choco", "Chocolate"),
    ("vanille", "Vanilla"), ("vanilla", "Vanilla"),
    ("fraise", "Strawberry"), ("strawberry", "Strawberry"),
    ("café", "Coffee"), ("cappuccino", "Coffee"), ("coffee", "Coffee"),
    ("citron", "Lemon"), ("lemon", "Lemon"),
    ("caramel", "Caramel"),
    ("framboise", "Raspberry"), ("raspberry", "Raspberry"),
    ("noisette", "Hazelnut"),
    ("myrtille", "Blueberry"), ("blueberry", "Blueberry"),
    ("mangue", "Mango"), ("mango", "Mango"),
    ("nature", "Original"), ("original", "Original"),
]


def guess_flavor(name: str) -> str | None:
    low = name.lower()
    for hint, flavor in FLAVOR_HINTS:
        if hint in low:
            return flavor
    return None


def build_real_products(records: list[dict], category: str, subcat_map: dict, id_prefix: str, start_idx: int, limit: int, name_keyword: str | None = None) -> list[Product]:
    products: list[Product] = []
    seen_codes: set[str] = set()
    seen_names: set[str] = set()
    idx = start_idx
    for p in records:
        if len(products) >= limit:
            break
        if not is_complete(p):
            continue
        code = p["code"]
        name = p["product_name"].strip()
        name_key = name.lower()
        if code in seen_codes or name_key in seen_names:
            continue
        if not matches_category(name, name_keyword):
            continue
        seen_codes.add(code)
        seen_names.add(name_key)

        cat_tags = p.get("categories_tags", [])
        subcategory = "Khác"
        for tag, vi in subcat_map.items():
            if tag in cat_tags:
                subcategory = vi
                break

        allergen_tags = p.get("allergens_tags", [])
        allergens_vi = [ALLERGEN_VI.get(t, t.replace("en:", "")) for t in allergen_tags]

        pid = f"{id_prefix}-{idx:04d}"
        idx += 1

        products.append(Product(
            id=pid,
            name=name,
            slug=slugify(name) + f"-{code[-4:]}",
            category=category,
            subcategory=subcategory,
            description=None,  # OFF has no marketing description field populated here
            flavor=guess_flavor(name),
            filling=None,  # not derivable from OFF fields without over-interpreting ingredients
            ingredients_status="real",
            ingredients_raw=p.get("ingredients_text", "").strip(),
            allergens="; ".join(allergens_vi) if allergens_vi else "",
            allergens_status="real" if allergen_tags else "missing",
            tags="real-import;open-food-facts",
            image_url=p.get("image_front_url") or p.get("image_url"),
            image_license_status="cc-by-sa-attribution-required",
            barcode=code,
            brand=p.get("brands") or None,
            source="Open Food Facts",
            source_url=f"https://world.openfoodfacts.org/product/{code}",
            source_product_id=code,
            data_origin="real",
            license="ODbL 1.0 (data); image typically CC BY-SA (per-contributor, verify before reuse)",
            notes="Imported as-is from Open Food Facts. Packaged retail product, not a Leaf Creme custom order item.",
        ))

        qty = p.get("product_quantity")
        unit = p.get("product_quantity_unit") or "g"
        sku = f"{id_prefix}-{code[-6:]}"
        # No source used here publishes real VND retail prices. Since gia_bienthe
        # is NOT NULL in the live schema, a resale price is estimated so the row
        # is importable at all -- this is Leaf Creme's own hypothetical resale
        # price for a third-party packaged good, not a claim about what the
        # original brand charges. Always flagged price_data_origin=synthetic.
        grams = float(qty) if unit == "g" else float(qty) * (1000 if unit == "kg" else 1)
        price = max(20000, round(grams * 280 / 1000) * 1000)
        products[-1].variants.append(Variant(
            sku=sku,
            product_id=pid,
            size=p.get("quantity", "") or f"{qty}{unit}",
            size_unit="package",
            weight=str(qty),
            weight_unit=unit,
            servings="",
            servings_status="missing",
            price=str(int(price)),
            price_currency="VND",
            price_data_origin="synthetic",  # estimated resale price; not sourced from OFF (no pricing data exists there)
            data_origin="real",
        ))
    return products


def build_synthetic_products() -> list[Product]:
    """Banh kem / Mousse: Leaf Creme's own made-to-order category.

    No open dataset publishes a real bakery's whole-cake price list, so these
    are placeholder catalog entries for dev/staging seeding only. Ingredients
    and allergens are left explicitly missing rather than invented; prices
    are clearly flagged synthetic placeholders modeled loosely on the price
    band already used in scripts/seed_demo_data.py.
    """
    specs = [
        # (name, category, subcategory, flavor, base VND price for the 16cm size)
        ("Bánh kem dâu tây", "Bánh kem", "Bánh kem trái cây", "Strawberry", 320000),
        ("Bánh kem socola", "Bánh kem", "Bánh kem socola", "Chocolate", 340000),
        ("Bánh kem vani hoa quả", "Bánh kem", "Bánh kem trái cây", "Vanilla", 300000),
        ("Mousse xoài", "Mousse", "Mousse trái cây", "Mango", 280000),
        ("Mousse socola đắng", "Mousse", "Mousse socola", "Chocolate", 300000),
    ]
    size_specs = [
        ("16cm", "cm", 600, "g", 6),
        ("20cm", "cm", 1000, "g", 10),
        ("25cm", "cm", 1600, "g", 16),
    ]
    products: list[Product] = []
    idx = 1
    for name, category, subcategory, flavor, base_price in specs:
        pid = f"LC-SYN-{idx:04d}"
        idx += 1
        prod = Product(
            id=pid,
            name=name,
            slug=slugify(name),
            category=category,
            subcategory=subcategory,
            description=None,
            flavor=flavor,
            filling=None,
            ingredients_status="missing",
            ingredients_raw=None,
            allergens="",
            allergens_status="missing_unverified",
            tags="synthetic-placeholder;needs-review",
            image_url=None,
            image_license_status="none",
            barcode=None,
            brand="Leaf Crème",
            source="synthetic",
            source_url=None,
            source_product_id=None,
            data_origin="synthetic",
            license="n/a (internal placeholder, not derived from any external source)",
            notes=(
                "PLACEHOLDER for dev/staging seeding only. No open dataset publishes real "
                "whole-cake bakery pricing/recipes; ingredients, allergens and price must be "
                "replaced with Leaf Crème's actual recipe/pricing before production use."
            ),
        )
        for size_label, size_unit, weight, weight_unit, servings in size_specs:
            scale = {"16cm": 1.0, "20cm": 1.45, "25cm": 2.05}[size_label]
            price = round(base_price * scale / 1000) * 1000
            sku = f"{slugify(name).upper().replace('-', '')[:8]}-{size_label}"
            prod.variants.append(Variant(
                sku=sku,
                product_id=pid,
                size=size_label,
                size_unit=size_unit,
                weight=str(weight),
                weight_unit=weight_unit,
                servings=str(servings),
                servings_status="estimated",
                price=str(int(price)),
                price_currency="VND",
                price_data_origin="synthetic",
                data_origin="synthetic",
            ))
        products.append(prod)
    return products


def main() -> None:
    tiramisu_raw = load_off("openfoodfacts_tiramisu_2026-08-10.json")
    sponge_raw = load_off("openfoodfacts_sponge-cakes_2026-08-10.json")

    tiramisu_subcats = {
        "en:tiramisu": "Tiramisu cổ điển",
    }
    sponge_subcats = {
        "en:pound-cake": "Bông lan bơ",
        "en:sponge-cakes": "Bông lan trứng",
        "en:madeleines": "Bông lan madeleine",
        "en:chocolate-cakes": "Bông lan socola",
    }

    real_tiramisu = build_real_products(tiramisu_raw, "Tiramisu", tiramisu_subcats, "OFF-TIRA", 1, 8, name_keyword="tiramisu")
    real_sponge = build_real_products(sponge_raw, "Bông lan", sponge_subcats, "OFF-SPNG", 1, 8)
    synthetic = build_synthetic_products()

    all_products = real_tiramisu + real_sponge + synthetic

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # ---- products.csv ----
    product_fields = [
        "id", "name", "slug", "category", "subcategory", "description", "flavor",
        "filling", "ingredients_status", "allergens", "allergens_status", "tags",
        "image_url", "image_license_status", "barcode", "brand", "source",
        "source_url", "source_product_id", "data_origin", "license", "notes",
    ]
    with (OUT_DIR / "products.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=product_fields)
        w.writeheader()
        for p in all_products:
            row = {k: getattr(p, k) for k in product_fields}
            w.writerow(row)

    # ---- product_variants.csv ----
    variant_fields = [
        "sku", "product_id", "size", "size_unit", "weight", "weight_unit",
        "servings", "servings_status", "price", "price_currency",
        "price_data_origin", "data_origin",
    ]
    with (OUT_DIR / "product_variants.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=variant_fields)
        w.writeheader()
        for p in all_products:
            for v in p.variants:
                w.writerow({k: getattr(v, k) for k in variant_fields})

    # ---- categories.csv ----
    seen_cats: set[tuple[str, str]] = set()
    cat_rows = []
    cat_desc = {
        "Bánh kem": "Bánh kem tươi làm theo yêu cầu, nhiều kích thước.",
        "Bông lan": "Bánh bông lan mềm, đóng gói sẵn.",
        "Mousse": "Bánh mousse lạnh, nhiều hương vị.",
        "Tiramisu": "Bánh Tiramisu kiểu Ý, đóng gói sẵn.",
    }
    for p in all_products:
        key = (p.category, p.subcategory)
        if key in seen_cats:
            continue
        seen_cats.add(key)
        cat_rows.append({
            "category": p.category,
            "subcategory": p.subcategory,
            "category_description": cat_desc.get(p.category, ""),
        })
    with (OUT_DIR / "categories.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["category", "subcategory", "category_description"])
        w.writeheader()
        w.writerows(sorted(cat_rows, key=lambda r: (r["category"], r["subcategory"])))

    # ---- ingredients.csv + product_ingredients.csv ----
    ingredient_id_map: dict[str, int] = {}
    ingredients_rows = []
    product_ingredient_rows = []
    next_ing_id = 1
    for p in all_products:
        if p.ingredients_status != "real" or not p.ingredients_raw:
            continue
        parts = split_top_level(p.ingredients_raw, ",")
        for position, raw in enumerate(parts, start=1):
            name = clean_ingredient_name(raw)
            if not name or len(name) > 80:
                continue
            key = name.lower()
            if key not in ingredient_id_map:
                ingredient_id_map[key] = next_ing_id
                ingredients_rows.append({
                    "ingredient_id": next_ing_id,
                    "name": name,
                    "data_origin": "real",
                    "source": "Open Food Facts (parsed from ingredients_text)",
                })
                next_ing_id += 1
            product_ingredient_rows.append({
                "product_id": p.id,
                "ingredient_id": ingredient_id_map[key],
                "position": position,
                "raw_text": raw.strip(),
            })

    with (OUT_DIR / "ingredients.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["ingredient_id", "name", "data_origin", "source"])
        w.writeheader()
        w.writerows(ingredients_rows)

    with (OUT_DIR / "product_ingredients.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["product_id", "ingredient_id", "position", "raw_text"])
        w.writeheader()
        w.writerows(product_ingredient_rows)

    # ---- products.json (nested, convenience) ----
    json_out = []
    for p in all_products:
        d = p.__dict__.copy()
        d["variants"] = [v.__dict__ for v in p.variants]
        json_out.append(d)
    with (OUT_DIR / "products.json").open("w", encoding="utf-8") as f:
        json.dump(json_out, f, ensure_ascii=False, indent=2)

    print(f"products: {len(all_products)} (real={len(real_tiramisu) + len(real_sponge)}, synthetic={len(synthetic)})")
    print(f"variants: {sum(len(p.variants) for p in all_products)}")
    print(f"ingredients: {len(ingredients_rows)}")
    print(f"product_ingredients rows: {len(product_ingredient_rows)}")
    print(f"categories: {len(cat_rows)}")


if __name__ == "__main__":
    main()
