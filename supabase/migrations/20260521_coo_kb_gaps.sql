-- COO Knowledge Base Gaps: questions where the COO agent's search_kb tool
-- returned no useful content. Surfaces a content-creation backlog.
--
-- No customer-facing UI — admin-only view at /admin/kb-gaps.

CREATE TABLE IF NOT EXISTS coo_kb_gaps (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  user_question   TEXT         NOT NULL,
  kb_query        TEXT,
  found_results   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coo_kb_gaps_created_at_idx
  ON coo_kb_gaps (created_at DESC);

-- RLS: no customer access — admin reads via service role only
ALTER TABLE coo_kb_gaps ENABLE ROW LEVEL SECURITY;
