-- CP-38 — Hire chat: server-side persistence for the dedicated hiring chat
-- (sibling to coo_chat_sessions / coo_chat_messages from CP-14).
--
-- Why a separate table from coo_chat_*:
--   "Ask COO" (read-only Q&A + research) and "Hire" (build your AI workforce)
--   are now two distinct customer surfaces — see CP-38 + competitor research
--   (Notion 3.3 / Lindy 3.0 / Microsoft Copilot Studio all ship a dedicated
--   builder route separate from their Q&A chat). Mixing the two session
--   histories in one table would force every consumer to filter by `kind`
--   and is more refactor than benefit; tables are cheap.
--
-- Mirrors the CP-14 design exactly: per-user RLS, after-insert trigger that
-- bumps last_message_at + message_count + updated_at on the parent session.

CREATE TABLE IF NOT EXISTS hire_chat_sessions (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT         NOT NULL DEFAULT 'New hire',
  message_count   INT          NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hire_chat_sessions_user_recent_idx
  ON hire_chat_sessions (user_id, last_message_at DESC);

ALTER TABLE hire_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own hire chat sessions"
  ON hire_chat_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS hire_chat_messages (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID         NOT NULL REFERENCES hire_chat_sessions(id) ON DELETE CASCADE,
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT         NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT         NOT NULL DEFAULT '',
  tool_steps      JSONB,
  -- For the hire chat, the inline card we render is the propose_custom_employee
  -- draft preview (CustomEmployeeDraft shape). Stored as raw JSON so we don't
  -- have to migrate the schema every time the compiler output evolves.
  draft_card      JSONB,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hire_chat_messages_session_created_idx
  ON hire_chat_messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS hire_chat_messages_user_id_idx
  ON hire_chat_messages (user_id);

ALTER TABLE hire_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own hire chat messages"
  ON hire_chat_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION hire_chat_messages_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hire_chat_sessions
     SET last_message_at = NEW.created_at,
         updated_at      = NEW.created_at,
         message_count   = message_count + 1
   WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hire_chat_messages_bump
  AFTER INSERT ON hire_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION hire_chat_messages_after_insert();
