"""Persist checkout idempotency and SePay receipts for reconciliation."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0017_checkout_sepay"
down_revision = "0016_seed_customer_role"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "checkout_requests",
        sa.Column("checkout_id", sa.Integer(), primary_key=True),
        sa.Column("nguoidung_id", sa.Integer(), sa.ForeignKey("nguoidung.nguoidung_id", ondelete="CASCADE"), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("donhang_id", sa.Integer(), sa.ForeignKey("donhang.donhang_id", ondelete="RESTRICT"), nullable=False),
        sa.Column("ngay_tao", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("nguoidung_id", "idempotency_key", name="uq_checkout_user_key"),
    )
    op.create_table(
        "sepay_transactions",
        sa.Column("transaction_id", sa.String(100), primary_key=True),
        sa.Column("thanhtoan_id", sa.Integer(), sa.ForeignKey("thanhtoan.thanhtoan_id", ondelete="SET NULL")),
        sa.Column("donhang_id", sa.Integer(), sa.ForeignKey("donhang.donhang_id", ondelete="SET NULL")),
        sa.Column("so_tien", sa.Numeric(18, 2), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("reason", sa.String(100), nullable=False),
        sa.Column("refund_reference", sa.String(100)),
        sa.Column("refund_note", sa.Text()),
        sa.Column("resolved_by", sa.Integer(), sa.ForeignKey("nguoidung.nguoidung_id", ondelete="SET NULL")),
        sa.Column("resolved_at", sa.DateTime()),
        sa.Column("ngay_tao", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('confirmed', 'refund_required', 'refunded', 'unmatched', 'ignored')", name="ck_sepay_transaction_status"),
    )
    op.create_index("ix_sepay_transactions_thanhtoan_id", "sepay_transactions", ["thanhtoan_id"])
    op.create_index("ix_sepay_transactions_status", "sepay_transactions", ["status"])


def downgrade():
    op.drop_table("sepay_transactions")
    op.drop_table("checkout_requests")
