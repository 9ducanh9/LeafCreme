"""add Cognito subject to application users.

Revision ID: 0004_add_cognito_subject
Revises: 0003_align_operational_enums
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_add_cognito_subject"
down_revision = "0003_align_operational_enums"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("nguoidung", sa.Column("cognito_sub", sa.String(length=255), nullable=True))
    op.create_unique_constraint("uq_nguoidung_cognito_sub", "nguoidung", ["cognito_sub"])


def downgrade() -> None:
    op.drop_constraint("uq_nguoidung_cognito_sub", "nguoidung", type_="unique")
    op.drop_column("nguoidung", "cognito_sub")
