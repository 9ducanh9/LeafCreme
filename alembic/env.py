"""Alembic environment.

Wired to the app's own DB config so there is exactly one source of truth for
DATABASE_URL (app/db.py) and one source of truth for the schema (app/models.py).
No separate credentials or model duplication to keep in sync.
"""
import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Make "app" importable when alembic is run from the repo root.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import Base  # noqa: E402
from app import models  # noqa: E402,F401  (import registers all tables on Base.metadata)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_database_url() -> str:
    """Same normalization rules as app/db.py: accept postgres:// or postgresql://
    and force the psycopg2 driver so alembic and the app never disagree."""
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL not set. Alembic needs the same DATABASE_URL the app uses "
            "(see .env.example)."
        )
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg2://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


def run_migrations_offline() -> None:
    """Generate SQL without a DB connection (`alembic upgrade head --sql`)."""
    context.configure(
        url=get_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Standard path: connect to DATABASE_URL and apply migrations."""
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_database_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
