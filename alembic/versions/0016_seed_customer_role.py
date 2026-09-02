"""ensure the public self-registration role exists."""

from alembic import op


revision = "0016_seed_customer_role"
down_revision = "0015_avatar_db_storage"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO vaitro (ten_vai_tro, mo_ta)
        VALUES ('customer', 'Khách hàng')
        ON CONFLICT (ten_vai_tro) DO NOTHING
        """
    )


def downgrade() -> None:
    # This role may already be referenced by real users. Removing it during a
    # rollback would either violate the foreign key or delete shared seed data.
    pass
