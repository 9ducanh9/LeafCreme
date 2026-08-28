"""add product shelf life, production date, and compact catalog SKUs.

Revision ID: 0012_product_shelf_life
Revises: 0011_selective_autonomy
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0012_product_shelf_life"
down_revision = "0011_selective_autonomy"
branch_labels = None
depends_on = None


CATALOG: tuple[tuple[str, str, int | None], ...] = (
    ("Mousse chanh dây", "MOU01", 3),
    ("Mousse dâu tươi", "MOU02", 2),
    ("Mousse matcha phô mai", "MOU03", 3),
    ("Mousse chocolate đen", "MOU04", 4),
    ("Mousse việt quất", "MOU05", 3),
    ("Tiramisu classic coffee", "TIR01", 3),
    ("Tiramisu cacao", "TIR02", 3),
    ("Tiramisu matcha", "TIR03", None),
    ("Tiramisu dâu", "TIR04", None),
    ("Tiramisu oreo", "TIR05", None),
    ("Bông lan trứng muối basic", "SPO01", 3),
    ("Bông lan trứng muối phô mai", "SPO02", 2),
    ("Bông lan trứng muối sốt dầu trứng", "SPO03", 2),
    ("Bông lan bơ sữa trái cây", "SPO04", 2),
    ("Bông lan bơ sữa chocolate chips", "SPO05", 4),
    ("Bánh kem vanilla trái cây", "CRM01", 2),
    ("Bánh kem chocolate", "CRM02", 3),
    ("Bánh kem red velvet", "CRM03", 3),
    ("Bánh kem oreo", "CRM04", 3),
    ("Bánh kem tiramisu kem", "CRM05", 2),
)

LEGACY_PRODUCT_SKU = {
    new_sku: f"LC-{new_sku[:3]}-{new_sku[3:]}"
    for _, new_sku, _ in CATALOG
}

SIZE_TOKENS = {
    "6in": "15",
    "8in": "20",
    "10in": "25",
    "12in": "30",
    "7cm": "7",
    "16cm": "16",
    "18cm": "18",
    "20cm": "20",
    "s - 12cm (2-3 người)": "12",
    "m - 14cm (3-4 người)": "14",
    "l - 18cm (6-8 người)": "18",
}


def _target_products(conn) -> list[dict]:
    names = [name for name, _, _ in CATALOG]
    rows = conn.execute(
        sa.text("SELECT sanpham_id, ten, sku FROM sanpham WHERE ten IN :names").bindparams(
            sa.bindparam("names", expanding=True)
        ),
        {"names": names},
    ).mappings()
    return [dict(row) for row in rows]


def _assert_sku_available(conn, table: str, id_column: str, sku_column: str, target_id: int, sku: str) -> None:
    collision = conn.execute(
        sa.text(
            f"SELECT {id_column} FROM {table} "
            f"WHERE {sku_column} = :sku AND {id_column} <> :target_id"
        ),
        {"sku": sku, "target_id": target_id},
    ).first()
    if collision:
        raise RuntimeError(f"Cannot assign {table}.{sku_column}={sku!r}: already in use")


def _compact_catalog_skus(conn) -> None:
    by_name = {name: new_sku for name, new_sku, _ in CATALOG}
    products = _target_products(conn)
    desired_products = [(row["sanpham_id"], by_name[row["ten"]]) for row in products]

    variants: list[tuple[int, str]] = []
    for product_id, product_sku in desired_products:
        rows = conn.execute(
            sa.text(
                "SELECT bienthe_id, kich_thuoc FROM bienthesanpham "
                "WHERE sanpham_id = :product_id"
            ),
            {"product_id": product_id},
        ).mappings()
        for row in rows:
            raw_size = (row["kich_thuoc"] or "").strip().lower()
            size_token = SIZE_TOKENS.get(raw_size)
            if not size_token:
                raise RuntimeError(
                    f"Cannot compact SKU for variant {row['bienthe_id']}: unsupported size {raw_size!r}"
                )
            variants.append((row["bienthe_id"], f"{product_sku}-{size_token}"))

    if len({sku for _, sku in variants}) != len(variants):
        raise RuntimeError("Compact variant SKU mapping contains duplicates")
    for product_id, sku in desired_products:
        _assert_sku_available(conn, "sanpham", "sanpham_id", "sku", product_id, sku)
    for variant_id, sku in variants:
        _assert_sku_available(conn, "bienthesanpham", "bienthe_id", "sku_bienthe", variant_id, sku)

    for product_id, _ in desired_products:
        conn.execute(
            sa.text("UPDATE sanpham SET sku = :sku WHERE sanpham_id = :id"),
            {"sku": f"__0012P_{product_id}", "id": product_id},
        )
    for variant_id, _ in variants:
        conn.execute(
            sa.text("UPDATE bienthesanpham SET sku_bienthe = :sku WHERE bienthe_id = :id"),
            {"sku": f"__0012V_{variant_id}", "id": variant_id},
        )
    for product_id, sku in desired_products:
        conn.execute(
            sa.text("UPDATE sanpham SET sku = :sku WHERE sanpham_id = :id"),
            {"sku": sku, "id": product_id},
        )
    for variant_id, sku in variants:
        conn.execute(
            sa.text("UPDATE bienthesanpham SET sku_bienthe = :sku WHERE bienthe_id = :id"),
            {"sku": sku, "id": variant_id},
        )


def upgrade() -> None:
    op.add_column("sanpham", sa.Column("han_su_dung_ngay", sa.Integer(), nullable=True))
    op.create_check_constraint(
        "ck_sanpham_han_su_dung_ngay_positive",
        "sanpham",
        "han_su_dung_ngay IS NULL OR han_su_dung_ngay > 0",
    )
    op.add_column("lohangsanpham", sa.Column("ngay_san_xuat", sa.DateTime(), nullable=True))

    conn = op.get_bind()
    conn.execute(sa.text("UPDATE lohangsanpham SET ngay_san_xuat = ngay_nhap WHERE ngay_san_xuat IS NULL"))
    op.alter_column(
        "lohangsanpham",
        "ngay_san_xuat",
        existing_type=sa.DateTime(),
        nullable=False,
        server_default=sa.text("now()"),
    )

    for name, _, shelf_life_days in CATALOG:
        if shelf_life_days is not None:
            conn.execute(
                sa.text("UPDATE sanpham SET han_su_dung_ngay = :days WHERE ten = :name"),
                {"days": shelf_life_days, "name": name},
            )
    _compact_catalog_skus(conn)


def downgrade() -> None:
    conn = op.get_bind()
    for _, compact_sku, _ in CATALOG:
        legacy_sku = LEGACY_PRODUCT_SKU[compact_sku]
        conn.execute(
            sa.text("UPDATE sanpham SET sku = :legacy WHERE sku = :compact"),
            {"legacy": legacy_sku, "compact": compact_sku},
        )
        conn.execute(
            sa.text(
                "UPDATE bienthesanpham SET sku_bienthe = :legacy || '-' || UPPER(kich_thuoc) "
                "WHERE sanpham_id = (SELECT sanpham_id FROM sanpham WHERE sku = :legacy)"
            ),
            {"legacy": legacy_sku},
        )

    op.drop_column("lohangsanpham", "ngay_san_xuat")
    op.drop_constraint("ck_sanpham_han_su_dung_ngay_positive", "sanpham", type_="check")
    op.drop_column("sanpham", "han_su_dung_ngay")
