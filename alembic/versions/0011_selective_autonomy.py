"""add selective-autonomy policy and audit fields.

Revision ID: 0011_selective_autonomy
Revises: 0010_proactive_insights
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0011_selective_autonomy"
down_revision = "0010_proactive_insights"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "agent_actions",
        sa.Column("execution_policy", sa.String(length=30), nullable=False, server_default="APPROVAL_REQUIRED"),
    )
    op.add_column(
        "agent_actions",
        sa.Column("execution_mode", sa.String(length=20), nullable=False, server_default="human_approval"),
    )
    op.add_column("agent_actions", sa.Column("policy_reason", sa.Text(), nullable=True))
    op.add_column("agent_actions", sa.Column("trigger_context", postgresql.JSONB(), nullable=True))
    op.add_column("agent_actions", sa.Column("reasoning_reference", sa.Text(), nullable=True))
    op.add_column("agent_actions", sa.Column("idempotency_key", sa.String(length=128), nullable=True))
    op.add_column(
        "agent_actions",
        sa.Column("is_idempotent", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "agent_actions",
        sa.Column("execution_attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("agent_actions", sa.Column("langfuse_trace_id", sa.String(length=32), nullable=True))
    op.add_column("agent_actions", sa.Column("proactive_insight_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_agent_actions_proactive_insight",
        "agent_actions",
        "proactive_insights",
        ["proactive_insight_id"],
        ["insight_id"],
        ondelete="SET NULL",
    )
    op.create_unique_constraint("uq_agent_actions_idempotency_key", "agent_actions", ["idempotency_key"])
    op.create_check_constraint(
        "ck_agent_actions_execution_policy",
        "agent_actions",
        "execution_policy IN ('AUTO_ALLOWED', 'APPROVAL_REQUIRED', 'NEVER_AUTOMATE')",
    )
    op.create_check_constraint(
        "ck_agent_actions_execution_mode",
        "agent_actions",
        "execution_mode IN ('automatic', 'human_approval')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_agent_actions_execution_mode", "agent_actions", type_="check")
    op.drop_constraint("ck_agent_actions_execution_policy", "agent_actions", type_="check")
    op.drop_constraint("uq_agent_actions_idempotency_key", "agent_actions", type_="unique")
    op.drop_constraint("fk_agent_actions_proactive_insight", "agent_actions", type_="foreignkey")
    op.drop_column("agent_actions", "proactive_insight_id")
    op.drop_column("agent_actions", "langfuse_trace_id")
    op.drop_column("agent_actions", "execution_attempts")
    op.drop_column("agent_actions", "is_idempotent")
    op.drop_column("agent_actions", "idempotency_key")
    op.drop_column("agent_actions", "reasoning_reference")
    op.drop_column("agent_actions", "trigger_context")
    op.drop_column("agent_actions", "policy_reason")
    op.drop_column("agent_actions", "execution_mode")
    op.drop_column("agent_actions", "execution_policy")
