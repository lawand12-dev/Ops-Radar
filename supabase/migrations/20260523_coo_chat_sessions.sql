-- Server-side persistence for the COO chat: sessions + messages.
-- Replaces (and extends) the localStorage-only chat history with a
-- proper Supabase-backed conversation store so users get:
--   - cross-device sync
--   - multiple saved chats (sidebar history like ChatGPT)
--   - persistent action cards + tool steps tied to messages

CREATE TABLE IF NOT EXISTS coo_chat_sessions (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT         NOT NULL DEFAULT 'New chat',
  message_count   INT          NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coo_chat_sessions_user_recent_idx
  ON coo_chat_sessions (user_id, last_message_at DESC);

ALTER TABLE coo_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own chat sessions"
  ON coo_chat_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS coo_chat_messages (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID         NOT NULL REFERENCES coo_chat_sessions(id) ON DELETE CASCADE,
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT         NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT         NOT NULL DEFAULT '',
  tool_steps      JSONB,
  action_card     JSONB,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coo_chat_messages_session_created_idx
  ON coo_chat_messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS coo_chat_messages_user_id_idx
  ON coo_chat_messages (user_id);

ALTER TABLE coo_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own chat messages"
  ON coo_chat_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION coo_chat_messages_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE coo_chat_sessions
     SET last_message_at = NEW.created_at,
         updated_at      = NEW.created_at,
         message_count   = message_count + 1
   WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coo_chat_messages_bump
  AFTER INSERT ON coo_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION coo_chat_messages_after_insert();
