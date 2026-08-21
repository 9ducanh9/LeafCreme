"""Stable fingerprints emitted by the repository's demo/test seed scripts."""

DEMO_USERNAMES = ("admin", "pos01", "kho01", "customer01", "order_test_customer")
DEMO_EMAILS = (
    "admin@leafcreme.local",
    "pos01@leafcreme.local",
    "kho01@leafcreme.local",
    "customer01@leafcreme.local",
    "order-test-customer@leafcreme.local",
)

DEMO_PRODUCT_SKUS = (
    "BN-001",
    "BN-002",
    "BD-001",
    "BD-002",
    "BP-001",
    "ORDER-TEST-CAKE-001",
)
DEMO_VARIANT_SKUS = (
    "BN-001-TC-250",
    "BN-002-SN-180",
    "BD-001-DX-220",
    "BD-002-LD-160",
    "BP-001-SR-220",
    "ORDER-TEST-CAKE-001-S",
)
DEMO_PRODUCT_LOT_CODES = ("LSP-004", "LSP-005", "LSP-006", "LSP-007", "LSP-008", "ORDER-TEST-LOT-001")
DEMO_COMPONENT_SKUS = ("LK-DU-01", "LK-DX-02", "LK-SR-01")
DEMO_COMPONENT_LOT_CODES = ("LLK-004", "LLK-005", "LLK-006")
DEMO_VOUCHER_CODES = ("SALE15", "PCT10")
DEMO_GIFT_BOX_SKUS = tuple(f"GIFTBOX-{index}" for index in range(1, 9))
DEMO_GIFT_BOX_IDS = tuple(range(1, 9))
