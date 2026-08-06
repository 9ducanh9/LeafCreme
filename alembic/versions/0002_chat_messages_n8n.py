"""chat_messages: n8n Leafie chat memory table

Not modeled in app/models.py on purpose — this table is written to and read
by an external n8n workflow ("Database: Load Memory"), not by this FastAPI
app directly. It's included in Alembic anyway so a fresh environment (new
dev machine, staging, CI) has schema parity with production instead of n8n
failing with `relation "public.chat_messages" does not exist` the first
time someone stands up a new database.

Mirrors migrations/create_chat_messages.sql, which is now superseded by
this migration — that file can be deleted once this is applied everywhere.

Revision ID: 0002_chat_messages_n8n
Revises: 0001_baseline
"""
from alembic import op

revision = "0002_chat_messages_n8n"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS public.chat_messages (
          id BIGSERIAL PRIMARY KEY,
          session_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          intent TEXT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created_at "
        "ON public.chat_messages (session_id, created_at DESC);"
    )
    op.execute("COMMENT ON TABLE public.chat_messages IS "
               "'Chat history for Leafie / n8n memory. Not used by backend directly; created for n8n workflows.';")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.chat_messages CASCADE;")
