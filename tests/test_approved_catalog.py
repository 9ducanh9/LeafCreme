import re

from scripts.apply_approved_catalog import CATALOG, SHELF_LIFE_DAYS_BY_NAME, variant_sku


def test_catalog_uses_compact_unique_skus_for_all_products_and_sizes():
    assert len(CATALOG) == 20
    product_skus = [product.sku for product in CATALOG]
    variant_skus = [variant_sku(product, variant.size) for product in CATALOG for variant in product.variants]

    assert len(set(product_skus)) == 20
    assert len(variant_skus) == 60
    assert len(set(variant_skus)) == 60
    assert all(re.fullmatch(r"[A-Z]{3}\d{2}", sku) for sku in product_skus)
    assert all(re.fullmatch(r"[A-Z]{3}\d{2}-\d{1,3}", sku) for sku in variant_skus)
    assert variant_sku(next(product for product in CATALOG if product.sku == "CRM02"), "8in") == "CRM02-20"


def test_catalog_assigns_shelf_life_to_every_product():
    assert len(SHELF_LIFE_DAYS_BY_NAME) == 20
    assert set(SHELF_LIFE_DAYS_BY_NAME) == {product.name for product in CATALOG}
    assert SHELF_LIFE_DAYS_BY_NAME["Bánh kem chocolate"] == 3
    assert SHELF_LIFE_DAYS_BY_NAME["Bánh kem tiramisu kem"] == 2
    assert SHELF_LIFE_DAYS_BY_NAME["Tiramisu matcha"] == 3
    assert SHELF_LIFE_DAYS_BY_NAME["Tiramisu dâu"] == 3
    assert SHELF_LIFE_DAYS_BY_NAME["Tiramisu oreo"] == 3
