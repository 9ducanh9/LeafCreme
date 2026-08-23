"""add durable proactive Agent insights.

Revision ID: 0010_proactive_insights
Revises: 0009_agent_action_stale_reset
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0010_proactive_insights"
down_revision = "0009_agent_action_stale_reset"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "proactive_insights",
        sa.Column("insight_id", sa.Integer(), primary_key=True),
        sa.Column("source_alert_id", sa.Integer(), nullable=False),
        sa.Column("fingerprint", sa.String(length=64), nullable=False),
        sa.Column("scenario", sa.String(length=50), nullable=False),
        sa.Column("muc_do_nghiem_trong", sa.String(length=20), nullable=False),
        sa.Column("tieu_de", sa.String(length=300), nullable=False),
        sa.Column("khuyen_nghi", sa.Text(), nullable=False),
        sa.Column("bang_chung", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("tool_trace", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("prompt_version", sa.String(length=100), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=True),
        sa.Column("used_llm", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("trang_thai", sa.String(length=20), nullable=False, server_default="unread"),
        sa.Column("ngay_tao", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("ngay_doc", sa.DateTime(), nullable=True),
        sa.Column("ngay_xu_ly", sa.DateTime(), nullable=True),
        sa.Column("ngay_thay_the", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["source_alert_id"], ["canhbaotonkho.canhbao_id"], ondelete="CASCADE"),
        sa.UniqueConstraint("fingerprint", name="uq_proactive_insights_fingerprint"),
        sa.CheckConstraint(
            "trang_thai IN ('unread', 'read', 'resolved', 'superseded')",
            name="ck_proactive_insights_trang_thai",
        ),
        sa.CheckConstraint(
            "muc_do_nghiem_trong IN ('thap', 'binh_thuong', 'cao')",
            name="ck_proactive_insights_muc_do",
        ),
    )
    op.create_index("ix_proactive_insights_source_alert", "proactive_insights", ["source_alert_id"])
    op.create_index("ix_proactive_insights_status_created", "proactive_insights", ["trang_thai", "ngay_tao"])


def downgrade() -> None:
    op.drop_index("ix_proactive_insights_status_created", table_name="proactive_insights")
    op.drop_index("ix_proactive_insights_source_alert", table_name="proactive_insights")
    op.drop_table("proactive_insights")
