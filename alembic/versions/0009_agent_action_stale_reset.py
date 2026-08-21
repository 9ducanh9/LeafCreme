"""Track action claim time and manual stale-action resets."""

import sqlalchemy as sa
from alembic import op


revision = "0009_agent_action_stale_reset"
down_revision = "0008_agent_actions_v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("agent_actions", sa.Column("ngay_bat_dau_xu_ly", sa.DateTime(), nullable=True))
    op.add_column("agent_actions", sa.Column("nguoidung_reset_id", sa.Integer(), nullable=True))
    op.add_column("agent_actions", sa.Column("ngay_reset", sa.DateTime(), nullable=True))
    op.create_foreign_key("fk_agent_actions_reset_user", "agent_actions", "nguoidung", ["nguoidung_reset_id"], ["nguoidung_id"], ondelete="SET NULL")
    # Rows already in-flight before this migration need a deterministic age so
    # the stale-action escape hatch also covers them.
    op.execute("UPDATE agent_actions SET ngay_bat_dau_xu_ly = COALESCE(ngay_xu_ly, ngay_tao) WHERE trang_thai = 'dang_xu_ly' AND ngay_bat_dau_xu_ly IS NULL")


def downgrade() -> None:
    op.drop_constraint("fk_agent_actions_reset_user", "agent_actions", type_="foreignkey")
    op.drop_column("agent_actions", "ngay_reset")
    op.drop_column("agent_actions", "nguoidung_reset_id")
    op.drop_column("agent_actions", "ngay_bat_dau_xu_ly")
