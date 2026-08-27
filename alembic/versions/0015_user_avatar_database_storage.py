"""store user avatar bytes in PostgreSQL for durable runtime storage."""

from alembic import op


revision = "0015_avatar_db_storage"
down_revision = "0014_product_stock_attention"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # IF NOT EXISTS keeps this migration safe for local databases that had
    # the nullable compatibility columns added before their old migration
    # chain was brought up to date.
    op.execute("ALTER TABLE nguoidung ADD COLUMN IF NOT EXISTS avatar_data BYTEA")
    op.execute(
        "ALTER TABLE nguoidung ADD COLUMN IF NOT EXISTS avatar_content_type VARCHAR(100)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE nguoidung DROP COLUMN IF EXISTS avatar_content_type")
    op.execute("ALTER TABLE nguoidung DROP COLUMN IF EXISTS avatar_data")
