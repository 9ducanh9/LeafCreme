"""Replace temporary product records with the owner-approved Leaf Creme catalog.

The values below were supplied by the owner on 2026-08-14. They are new
business data, not a claim about the lost historical catalog. The legacy image
files are reused only as display assets.

Usage:
    python scripts/apply_approved_catalog.py --validate
    python scripts/apply_approved_catalog.py --dry-run
    python scripts/apply_approved_catalog.py --apply
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


@dataclass(frozen=True)
class VariantSeed:
    size: str
    price: int
    is_default: bool = False


@dataclass(frozen=True)
class ProductSeed:
    sku: str
    name: str
    category: str
    flavor: str
    description: str
    image_path: str
    variants: tuple[VariantSeed, ...]


def variants(*rows: tuple[str, int, bool]) -> tuple[VariantSeed, ...]:
    return tuple(VariantSeed(size=size, price=price, is_default=is_default) for size, price, is_default in rows)


CATALOG: tuple[ProductSeed, ...] = (
    ProductSeed("LC-MOU-01", "Mousse chanh dây", "Mousse", "chanh dây", "Mousse vị chanh dây.", "product/1_Mousse_chanh_dây.jpg", variants(("7cm", 45000, False), ("16cm", 220000, True), ("18cm", 280000, False))),
    ProductSeed("LC-MOU-02", "Mousse dâu tươi", "Mousse", "dâu tươi", "Mousse vị dâu tươi.", "product/2_Mousse_dâu_tươi.jpg", variants(("7cm", 45000, False), ("16cm", 220000, True), ("18cm", 280000, False))),
    ProductSeed("LC-MOU-03", "Mousse matcha phô mai", "Mousse", "matcha phô mai", "Mousse vị matcha phô mai.", "product/3_Mousse_matcha_phô_mai.jpg", variants(("7cm", 50000, False), ("16cm", 240000, True), ("18cm", 300000, False))),
    ProductSeed("LC-MOU-04", "Mousse chocolate đen", "Mousse", "chocolate đen", "Mousse vị chocolate đen.", "product/4_Mousse_chocolate_đen.jpg", variants(("7cm", 50000, False), ("16cm", 230000, True), ("18cm", 290000, False))),
    ProductSeed("LC-MOU-05", "Mousse việt quất", "Mousse", "việt quất", "Mousse vị việt quất.", "product/5_Mousse_việt_quất.jpg", variants(("7cm", 45000, False), ("16cm", 220000, True), ("18cm", 280000, False))),
    ProductSeed("LC-TIR-01", "Tiramisu classic coffee", "Tiramisu", "classic coffee", "Tiramisu vị classic coffee.", "product/6_Tiramisu_classic_coffee.jpg", variants(("6in", 220000, False), ("8in", 320000, True), ("10in", 450000, False))),
    ProductSeed("LC-TIR-02", "Tiramisu cacao", "Tiramisu", "cacao", "Tiramisu vị cacao.", "product/7_Tiramisu_cacao.jpg", variants(("6in", 230000, False), ("8in", 330000, True), ("10in", 460000, False))),
    ProductSeed("LC-TIR-03", "Tiramisu matcha", "Tiramisu", "matcha", "Tiramisu vị matcha.", "product/8_Tiramisu_matcha.jpg", variants(("6in", 240000, False), ("8in", 340000, True), ("10in", 470000, False))),
    ProductSeed("LC-TIR-04", "Tiramisu dâu", "Tiramisu", "dâu", "Tiramisu vị dâu.", "product/9_Tiramisu_dâu.jpg", variants(("6in", 230000, False), ("8in", 330000, True), ("10in", 460000, False))),
    ProductSeed("LC-TIR-05", "Tiramisu oreo", "Tiramisu", "oreo", "Tiramisu vị oreo.", "product/10_Tiramisu_oreo.jpg", variants(("6in", 240000, False), ("8in", 350000, True), ("10in", 480000, False))),
    ProductSeed("LC-SPO-01", "Bông lan trứng muối basic", "Bông lan", "trứng muối basic", "Bông lan trứng muối basic.", "product/11_Bông_lan_trứng_muối_basic.jpg", variants(("18cm", 180000, False), ("20cm", 240000, True))),
    ProductSeed("LC-SPO-02", "Bông lan trứng muối phô mai", "Bông lan", "trứng muối phô mai", "Bông lan trứng muối phô mai.", "product/12_Bông_lan_trứng_muối_phô_mai.jpg", variants(("18cm", 200000, False), ("20cm", 260000, True))),
    ProductSeed("LC-SPO-03", "Bông lan trứng muối sốt dầu trứng", "Bông lan", "trứng muối sốt dầu trứng", "Bông lan trứng muối sốt dầu trứng.", "product/13_Bông_lan_trứng_muối_sốt_dầu_trứng.jpg", variants(("18cm", 210000, False), ("20cm", 270000, True))),
    ProductSeed("LC-SPO-04", "Bông lan bơ sữa trái cây", "Bông lan", "bơ sữa trái cây", "Bông lan bơ sữa trái cây.", "product/14_Bông_lan_bơ_sữa_trái_cây.jpg", variants(("18cm", 190000, False), ("20cm", 250000, True))),
    ProductSeed("LC-SPO-05", "Bông lan bơ sữa chocolate chips", "Bông lan", "bơ sữa chocolate chips", "Bông lan bơ sữa chocolate chips.", "product/15_Bông_lan_bơ_sữa_chocolate_chips.jpg", variants(("18cm", 200000, False), ("20cm", 260000, True))),
    ProductSeed("LC-CRM-01", "Bánh kem vanilla trái cây", "Bánh kem", "vanilla trái cây", "Bánh kem vanilla trái cây.", "product/16_Banh_kem_vanilla_trai_cay.jpg", variants(("6in", 250000, False), ("8in", 380000, True), ("10in", 520000, False), ("12in", 680000, False))),
    ProductSeed("LC-CRM-02", "Bánh kem chocolate", "Bánh kem", "chocolate", "Bánh kem chocolate.", "product/17_Bánh_kem_chocolate.jpg", variants(("6in", 260000, False), ("8in", 390000, True), ("10in", 530000, False), ("12in", 690000, False))),
    ProductSeed("LC-CRM-03", "Bánh kem red velvet", "Bánh kem", "red velvet", "Bánh kem red velvet.", "product/18_Bánh_kem_red_velvet.jpg", variants(("6in", 270000, False), ("8in", 400000, True), ("10in", 540000, False), ("12in", 700000, False))),
    ProductSeed("LC-CRM-04", "Bánh kem oreo", "Bánh kem", "oreo", "Bánh kem oreo.", "product/19_Bánh_kem_oreo.jpg", variants(("6in", 260000, False), ("8in", 390000, True), ("10in", 530000, False), ("12in", 690000, False))),
    ProductSeed("LC-CRM-05", "Bánh kem tiramisu kem", "Bánh kem", "tiramisu kem", "Bánh kem tiramisu kem.", "product/20_Bánh_kem_tiramisu_kem.jpg", variants(("6in", 280000, False), ("8in", 410000, True), ("10in", 550000, False), ("12in", 720000, False))),
)

DEMO_SKUS = ("BN-001", "BN-002", "BD-001", "BD-002", "BP-001")
TEST_SKU_PREFIX = "LC_VERIFY%"


def variant_sku(product: ProductSeed, size: str) -> str:
    return f"{product.sku}-{size.upper()}".replace(" ", "")


def validate_catalog() -> None:
    if len(CATALOG) != 20:
        raise ValueError(f"Expected 20 products, found {len(CATALOG)}")
    if len({product.sku for product in CATALOG}) != len(CATALOG):
        raise ValueError("Product SKUs must be unique")
    if sum(len(product.variants) for product in CATALOG) != 60:
        raise ValueError("Expected 60 variants")
    for product in CATALOG:
        if sum(variant.is_default for variant in product.variants) != 1:
            raise ValueError(f"{product.sku} must have exactly one default variant")
        if not (ROOT / "uploads" / product.image_path).is_file():
            raise FileNotFoundError(f"Missing catalog image: {product.image_path}")


def print_catalog_summary(prefix: str = "") -> None:
    print(f"{prefix}products: {len(CATALOG)}")
    print(f"{prefix}variants: {sum(len(product.variants) for product in CATALOG)}")
    print(f"{prefix}categories: {', '.join(dict.fromkeys(product.category for product in CATALOG))}")


def get_blocking_references(db, product_ids: list[int], variant_ids: list[int], lot_ids: list[int]) -> dict[str, int]:
    """Return dependent records that make a regular catalog replacement unsafe."""
    from sqlalchemy import text

    checks = {
        "order items": ("SELECT count(*) FROM chitietdonhang WHERE lohang_sanpham_id = ANY(:lot_ids)", {"lot_ids": lot_ids}),
        "order allocations": ("SELECT count(*) FROM phanbolo_chitietdonhang WHERE lohang_sanpham_id = ANY(:lot_ids)", {"lot_ids": lot_ids}),
        "cart items": ("SELECT count(*) FROM chitietgiohang WHERE lohang_sanpham_id = ANY(:lot_ids)", {"lot_ids": lot_ids}),
        "inventory history": ("SELECT count(*) FROM lichsukhosanpham WHERE lohang_sanpham_id = ANY(:lot_ids)", {"lot_ids": lot_ids}),
        "inventory alerts": ("SELECT count(*) FROM canhbaotonkho WHERE lohang_sanpham_id = ANY(:lot_ids)", {"lot_ids": lot_ids}),
        "price history": ("SELECT count(*) FROM lichsugia WHERE sanpham_id = ANY(:product_ids) OR bienthe_id = ANY(:variant_ids)", {"product_ids": product_ids, "variant_ids": variant_ids}),
        "sales statistics": ("SELECT count(*) FROM thongkesanpham WHERE sanpham_id = ANY(:product_ids) OR bienthe_id = ANY(:variant_ids)", {"product_ids": product_ids, "variant_ids": variant_ids}),
    }
    blockers = {name: int(db.execute(text(sql), params).scalar_one()) for name, (sql, params) in checks.items()}
    return {name: count for name, count in blockers.items() if count}


def purge_test_dependents(
    db,
    product_ids: list[int],
    variant_ids: list[int],
    lot_ids: list[int],
    purge_mixed_orders: bool,
) -> None:
    """Delete only dependent rows belonging to the temporary catalog.

    A target order must contain exclusively temporary-product items. This is a
    hard stop if it has another item, preventing an import from removing part
    of a real customer's order.
    """
    from sqlalchemy import text

    target_order_ids = [
        int(row[0])
        for row in db.execute(
            text("SELECT DISTINCT donhang_id FROM chitietdonhang WHERE lohang_sanpham_id = ANY(:lot_ids)"),
            {"lot_ids": lot_ids},
        ).all()
    ]
    if target_order_ids:
        non_test_item_count = int(
            db.execute(
                text(
                    "SELECT count(*) FROM chitietdonhang "
                    "WHERE donhang_id = ANY(:order_ids) "
                    "AND (lohang_sanpham_id IS NULL OR NOT (lohang_sanpham_id = ANY(:lot_ids)))"
                ),
                {"order_ids": target_order_ids, "lot_ids": lot_ids},
            ).scalar_one()
        )
        if non_test_item_count and not purge_mixed_orders:
            raise RuntimeError(
                "Refusing to purge orders that also contain non-test items "
                f"({non_test_item_count} item(s))."
            )

    db.execute(text("DELETE FROM chitietgiohang WHERE lohang_sanpham_id = ANY(:lot_ids)"), {"lot_ids": lot_ids})
    db.execute(text("DELETE FROM lichsukhosanpham WHERE lohang_sanpham_id = ANY(:lot_ids)"), {"lot_ids": lot_ids})
    db.execute(text("DELETE FROM canhbaotonkho WHERE lohang_sanpham_id = ANY(:lot_ids)"), {"lot_ids": lot_ids})
    db.execute(
        text("DELETE FROM lichsugia WHERE sanpham_id = ANY(:product_ids) OR bienthe_id = ANY(:variant_ids)"),
        {"product_ids": product_ids, "variant_ids": variant_ids},
    )
    db.execute(
        text("DELETE FROM thongkesanpham WHERE sanpham_id = ANY(:product_ids) OR bienthe_id = ANY(:variant_ids)"),
        {"product_ids": product_ids, "variant_ids": variant_ids},
    )
    if target_order_ids:
        # History rows are purged first because they also reference their order.
        # The order cascade then removes payments, returns, items, and allocations.
        db.execute(text("DELETE FROM donhang WHERE donhang_id = ANY(:order_ids)"), {"order_ids": target_order_ids})


def replace_catalog(apply: bool, purge_test_data: bool, purge_mixed_orders: bool) -> None:
    from sqlalchemy import delete, or_

    from app.db import SessionLocal
    from app.models import BienTheSanPham, LoHangSanPham, SanPham

    db = SessionLocal()
    try:
        targets = db.query(SanPham).filter(or_(SanPham.sku.in_(DEMO_SKUS), SanPham.sku.like(TEST_SKU_PREFIX))).all()
        target_ids = [product.sanpham_id for product in targets]
        target_variants = db.query(BienTheSanPham).filter(BienTheSanPham.sanpham_id.in_(target_ids)).all() if target_ids else []
        target_variant_ids = [variant.bienthe_id for variant in target_variants]
        target_lots = db.query(LoHangSanPham).filter(LoHangSanPham.bienthe_sanpham_id.in_(target_variant_ids)).all() if target_variant_ids else []
        target_lot_ids = [lot.lohang_id for lot in target_lots]
        blockers = get_blocking_references(db, target_ids, target_variant_ids, target_lot_ids) if target_ids else {}
        if blockers and not purge_test_data:
            raise RuntimeError(f"Refusing to delete catalog rows with dependent records: {blockers}")

        if not apply:
            print(f"Dry run: would remove {len(target_ids)} temporary products, {len(target_variant_ids)} variants, and {len(target_lot_ids)} lots.")
            if blockers:
                print(f"Dry run: would purge dependent test data: {blockers}")
            print_catalog_summary("Would create/update ")
            return

        if blockers:
            purge_test_dependents(
                db,
                target_ids,
                target_variant_ids,
                target_lot_ids,
                purge_mixed_orders=purge_mixed_orders,
            )

        # Use a SQL DELETE so PostgreSQL applies its on-delete cascades from
        # sanpham -> bienthesanpham -> lohangsanpham consistently.
        if target_ids:
            db.execute(delete(SanPham).where(SanPham.sanpham_id.in_(target_ids)))
        db.flush()

        created_products = created_variants = 0
        for seed in CATALOG:
            product = db.query(SanPham).filter(SanPham.sku == seed.sku).first()
            default_variant = next(variant for variant in seed.variants if variant.is_default)
            if product is None:
                product = SanPham(sku=seed.sku)
                db.add(product)
                created_products += 1

            product.ten = seed.name
            product.loai = "bien_the"
            product.gia_co_ban = Decimal(default_variant.price)
            product.mo_ta = seed.description
            product.hinh_anh_url = seed.image_path
            product.danh_muc = seed.category
            product.don_vi_tinh = "chiếc"
            product.phu_hop_dip = None
            product.dang_hoat_dong = True
            db.flush()

            for seed_variant in sorted(seed.variants, key=lambda variant: not variant.is_default):
                sku = variant_sku(seed, seed_variant.size)
                variant = db.query(BienTheSanPham).filter(BienTheSanPham.sku_bienthe == sku).first()
                if variant is None:
                    variant = BienTheSanPham(sanpham_id=product.sanpham_id, sku_bienthe=sku)
                    db.add(variant)
                    created_variants += 1
                variant.sanpham_id = product.sanpham_id
                variant.huong_vi = seed.flavor
                variant.kich_thuoc = seed_variant.size
                variant.gia_bienthe = Decimal(seed_variant.price)
                variant.dang_hoat_dong = True

        db.commit()
        print(f"Removed {len(target_ids)} temporary products.")
        print(f"Created {created_products} products and {created_variants} variants.")
        print_catalog_summary("Approved catalog ")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--validate", action="store_true", help="Validate the static catalog and local image assets only")
    mode.add_argument("--dry-run", action="store_true", help="Check the production DB without writing")
    mode.add_argument("--apply", action="store_true", help="Delete approved temporary rows and import the approved catalog")
    parser.add_argument(
        "--purge-test-data",
        action="store_true",
        help="With --apply, remove test-only order, cart, inventory, alert, price, and statistic rows that block deletion.",
    )
    parser.add_argument(
        "--purge-mixed-orders",
        action="store_true",
        help="With --apply and --purge-test-data, also delete an order that contains a temporary-catalog item plus another item.",
    )
    args = parser.parse_args()

    validate_catalog()
    if args.validate:
        print_catalog_summary("Validated ")
        return
    if args.purge_test_data and not (args.apply or args.dry_run):
        parser.error("--purge-test-data requires --apply or --dry-run")
    if args.purge_mixed_orders and not (args.apply and args.purge_test_data):
        parser.error("--purge-mixed-orders requires --apply and --purge-test-data")
    replace_catalog(
        apply=args.apply,
        purge_test_data=args.purge_test_data,
        purge_mixed_orders=args.purge_mixed_orders,
    )


if __name__ == "__main__":
    main()
