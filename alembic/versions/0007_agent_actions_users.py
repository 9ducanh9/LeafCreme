"""split agent_actions.nguoidung_id into a proposer column and an approver column.

Revision ID: 0007_agent_actions_users
Revises: 0006_agent_actions

The original single `nguoidung_id` column was only ever written at
approve/reject time, so "who proposed this action" was never recorded and
was overwritten by "who approved it" — the audit trail couldn't answer
either question reliably. Splitting into `nguoidung_de_xuat_id` (set when
the action is proposed) and `nguoidung_duyet_id` (set when it's approved
or rejected) keeps both facts.
"""

import sqlalchemy as sa
from alembic import op


revision = "0007_agent_actions_users"
down_revision = "0006_agent_actions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("agent_actions", "nguoidung_id", new_column_name="nguoidung_duyet_id")
    op.add_column(
        "agent_actions",
        sa.Column("nguoidung_de_xuat_id", sa.Integer(), sa.ForeignKey("nguoidung.nguoidung_id", ondelete="SET NULL"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("agent_actions", "nguoidung_de_xuat_id")
    op.alter_column("agent_actions", "nguoidung_duyet_id", new_column_name="nguoidung_id")
