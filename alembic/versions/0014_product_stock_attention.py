"""add product-level stock attention alert type

Revision ID: 0014_product_stock_attention
Revises: 0013_complete_catalog_shelf_life
"""

from alembic import op


revision = "0014_product_stock_attention"
down_revision = "0013_complete_catalog_shelf_life"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The existing alert table already permits a source-less operational
    # alert. This label represents one deterministic catalog-wide stock
    # digest, so no product, user, or inventory rows need to be rewritten.
    op.execute("ALTER TYPE loai_canh_bao ADD VALUE IF NOT EXISTS 'san_pham_can_nhap'")


def downgrade() -> None:
    # PostgreSQL cannot remove an enum label without recreating dependent
    # columns. Keep this migration forward-only to avoid a destructive rewrite.
    pass
