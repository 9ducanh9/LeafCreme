"""add agent_actions table for the Operations Agent's governed action log.

Revision ID: 0006_agent_actions
Revises: 0005_normalize_sku_case

Every mutating action the Operations Agent takes goes through this table
first: it's an audit trail (who/what proposed it, who approved it, what
happened) rather than a queue, since approval executes the underlying tool
synchronously (see app/services/agent/agent_service.py). Read-only tool
calls (querying state) never create a row here.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0006_agent_actions"
down_revision = "0005_normalize_sku_case"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "agent_actions",
        sa.Column("action_id", sa.Integer(), primary_key=True),
        sa.Column("loai_hanh_dong", sa.String(length=50), nullable=False),
        sa.Column("tham_so", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("ly_do", sa.Text(), nullable=True),
        sa.Column("nguon", sa.String(length=20), nullable=False, server_default="agent"),
        sa.Column("muc_do_rui_ro", sa.String(length=20), nullable=False),
        # "dang_xu_ly" is a short-lived transient state: approve_action
        # atomically claims a "de_xuat" row into "dang_xu_ly" (a single
        # UPDATE ... WHERE trang_thai='de_xuat', committed immediately)
        # before running the underlying tool, then moves it to its
        # terminal state. This is what actually prevents two concurrent
        # approvals from both executing the tool — see
        # app/services/agent/agent_service.py::approve_action.
        sa.Column("trang_thai", sa.String(length=20), nullable=False, server_default="de_xuat"),
        sa.Column("ket_qua", postgresql.JSONB(), nullable=True),
        sa.Column("loi", sa.Text(), nullable=True),
        sa.Column("nguoidung_id", sa.Integer(), sa.ForeignKey("nguoidung.nguoidung_id", ondelete="SET NULL"), nullable=True),
        sa.Column("ngay_tao", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("ngay_xu_ly", sa.DateTime(), nullable=True),
        sa.CheckConstraint("nguon IN ('agent', 'nhan_vien')", name="ck_agent_actions_nguon"),
        sa.CheckConstraint("muc_do_rui_ro IN ('doc', 'thay_doi')", name="ck_agent_actions_muc_do_rui_ro"),
        sa.CheckConstraint(
            "trang_thai IN ('de_xuat', 'dang_xu_ly', 'hoan_thanh', 'tu_choi', 'that_bai')",
            name="ck_agent_actions_trang_thai",
        ),
    )
    op.create_index("ix_agent_actions_trang_thai", "agent_actions", ["trang_thai"])
    op.create_index("ix_agent_actions_ngay_tao", "agent_actions", ["ngay_tao"])


def downgrade() -> None:
    op.drop_index("ix_agent_actions_ngay_tao", table_name="agent_actions")
    op.drop_index("ix_agent_actions_trang_thai", table_name="agent_actions")
    op.drop_table("agent_actions")
