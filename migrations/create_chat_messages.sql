-- Migration: Create chat_messages table for Leafie / n8n chat memory
-- Date: 2025-12-30
-- Description:
--   n8n workflow "Database: Load Memory" đang query:
--     SELECT role, content, intent FROM public."chat_messages" WHERE session_id = ? ORDER BY created_at DESC LIMIT 5;
--   Repo này không tạo bảng chat mặc định, nên cần migration này để tránh lỗi:
--     relation "public.chat_messages" does not exist

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,        -- 'user' | 'assistant' | 'system' (tuỳ n8n workflow)
  content TEXT NOT NULL,     -- nội dung message
  intent TEXT NULL,          -- intent (nếu workflow có)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to speed up "load last N messages by session_id"
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created_at
  ON public.chat_messages (session_id, created_at DESC);

COMMENT ON TABLE public.chat_messages IS 'Chat history for Leafie / n8n memory. Not used by backend directly; created for n8n workflows.';
COMMENT ON COLUMN public.chat_messages.session_id IS 'Conversation/session key (should stay constant throughout a chat).';
COMMENT ON COLUMN public.chat_messages.role IS 'Message role: user/assistant/system.';
COMMENT ON COLUMN public.chat_messages.intent IS 'Optional intent associated with message.';
COMMENT ON COLUMN public.chat_messages.created_at IS 'Message timestamp (server default).';



