"""normalize product/variant SKU casing to uppercase.

Revision ID: 0005_normalize_sku_case
Revises: 0004_add_cognito_subject

App-layer now always uppercases sku / sku_bienthe on write (see
app/routers/products.py _normalize_sku), so 'cake-001' and 'CAKE-001' can
no longer both be created going forward. This backfills rows written
before that change.

Guarded: if any existing rows would collide once uppercased (i.e. the
table already has two "real" case-variant duplicates, e.g. both
'CAKE-001' and 'cake-001' already in use as if they were different
products), the upgrade aborts with a clear error instead of silently
picking a winner — that needs a human to decide which row is right,
not a migration.
"""

import sqlalchemy as sa
from alembic import op


revision = "0005_normalize_sku_case"
down_revision = "0004_add_cognito_subject"
branch_labels = None
depends_on = None


def _normalize_column(conn, table: str, id_col: str, sku_col: str, allow_null: bool) -> None:
    null_clause = f" WHERE {sku_col} IS NOT NULL" if allow_null else ""
    collisions = conn.execute(sa.text(
        f"""
        SELECT UPPER({sku_col}) AS normalized, array_agg({id_col} ORDER BY {id_col}) AS ids,
               array_agg({sku_col} ORDER BY {id_col}) AS originals
        FROM {table}
        {null_clause}
        GROUP BY UPPER({sku_col})
        HAVING COUNT(DISTINCT {sku_col}) > 1
        """
    )).fetchall()
    if collisions:
        details = "; ".join(
            f"{row.normalized!r} <- {list(zip(row.ids, row.originals))}" for row in collisions
        )
        raise RuntimeError(
            f"Cannot normalize {table}.{sku_col} to uppercase: existing rows would collide "
            f"once case is ignored. Resolve manually first (rename/merge one side of each "
            f"pair), then re-run this migration. Collisions: {details}"
        )

    conn.execute(sa.text(
        f"UPDATE {table} SET {sku_col} = UPPER(TRIM({sku_col})){null_clause}"
        f"{' AND' if allow_null else ' WHERE'} {sku_col} <> UPPER(TRIM({sku_col}))"
    ))


def upgrade() -> None:
    conn = op.get_bind()
    _normalize_column(conn, "sanpham", "sanpham_id", "sku", allow_null=False)
    _normalize_column(conn, "bienthesanpham", "bienthe_id", "sku_bienthe", allow_null=True)


def downgrade() -> None:
    # Casing normalization loses the original casing; not reversible.
    pass
