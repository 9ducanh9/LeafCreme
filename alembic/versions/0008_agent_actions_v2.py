"""Operations Agent V2: tool classification + stale-approval preconditions.

Revision ID: 0008_agent_actions_v2
Revises: 0007_agent_actions_users

Two additions to agent_actions:

- `muc_do_rui_ro` ('doc'/'thay_doi') is renamed to `phan_loai` and now
  holds one of 'read'/'draft'/'execute' — the ambiguous doc/thay_doi
  split didn't distinguish "records a recommendation, no irreversible
  effect" (draft) from "actually mutates business state" (execute), which
  matters for who's allowed to approve (see
  app/services/agent/agent_service.py::_require_role_for_classification).
  A separate, optional `muc_do_uu_tien` (low/medium/high) is added
  alongside it for a human-facing risk tier independent of classification.

- `dieu_kien_tien_quyet` (JSONB) stores a snapshot of the mutating tool's
  target state captured at propose time (AgentTool.capture_state).
  approve_action re-validates it against live state
  (AgentTool.revalidate_state) before executing, so an approval can't fire
  against a target that changed after the proposal was made (e.g. an
  order that shipped between proposing and approving its cancellation).
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0008_agent_actions_v2"
down_revision = "0007_agent_actions_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE agent_actions DROP CONSTRAINT ck_agent_actions_muc_do_rui_ro")
    op.alter_column("agent_actions", "muc_do_rui_ro", new_column_name="phan_loai")
    op.execute("UPDATE agent_actions SET phan_loai = CASE phan_loai WHEN 'doc' THEN 'read' ELSE 'execute' END")
    op.create_check_constraint("ck_agent_actions_phan_loai", "agent_actions", "phan_loai IN ('read', 'draft', 'execute')")

    op.add_column("agent_actions", sa.Column("muc_do_uu_tien", sa.String(length=20), nullable=True))
    op.create_check_constraint(
        "ck_agent_actions_muc_do_uu_tien", "agent_actions", "muc_do_uu_tien IN ('low', 'medium', 'high')"
    )

    op.add_column("agent_actions", sa.Column("dieu_kien_tien_quyet", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("agent_actions", "dieu_kien_tien_quyet")

    op.drop_constraint("ck_agent_actions_muc_do_uu_tien", "agent_actions")
    op.drop_column("agent_actions", "muc_do_uu_tien")

    op.execute("ALTER TABLE agent_actions DROP CONSTRAINT ck_agent_actions_phan_loai")
    op.execute("UPDATE agent_actions SET phan_loai = CASE phan_loai WHEN 'read' THEN 'doc' ELSE 'thay_doi' END")
    op.alter_column("agent_actions", "phan_loai", new_column_name="muc_do_rui_ro")
    op.create_check_constraint(
        "ck_agent_actions_muc_do_rui_ro", "agent_actions", "muc_do_rui_ro IN ('doc', 'thay_doi')"
    )
