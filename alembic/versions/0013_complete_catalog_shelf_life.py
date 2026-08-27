"""complete shelf-life defaults for the Tiramisu catalog.

Revision ID: 0013_complete_catalog_shelf_life
Revises: 0012_product_shelf_life
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0013_complete_catalog_shelf_life"
down_revision = "0012_product_shelf_life"
branch_labels = None
depends_on = None


PRODUCT_NAMES = (
    "Tiramisu matcha",
    "Tiramisu dâu",
    "Tiramisu oreo",
)


def upgrade() -> None:
    op.get_bind().execute(
        sa.text(
            "UPDATE sanpham SET han_su_dung_ngay = 3 "
            "WHERE ten IN :names"
        ).bindparams(sa.bindparam("names", expanding=True)),
        {"names": list(PRODUCT_NAMES)},
    )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text(
            "UPDATE sanpham SET han_su_dung_ngay = NULL "
            "WHERE ten IN :names AND han_su_dung_ngay = 3"
        ).bindparams(sa.bindparam("names", expanding=True)),
        {"names": list(PRODUCT_NAMES)},
    )
