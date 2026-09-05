-- Diorization pipeline: the Tier-3 (live, per-tenant) layer of the
-- 3-tier hybrid GraphRAG specced in ai-native-company-2026.md Loop 2.
--
-- Flow:
--   Raw source (Slack export / Gmail mbox / Zoom transcript / Notion export)
--     → ingestion_sources row (one per OAuth/upload connection)
--     → breadcrumbs (one per conversation/thread/meeting, with embedding)
--     → pattern_cards (recurring themes extracted across breadcrumbs)
--     → living_briefs (one current 5-10 page synthesis per tenant)
--
-- Privacy + permissions rule (encoded in code, not just docs):
--   - Source ACLs are respected at ingestion time (private DMs with
--     non-consenting third parties are NOT diorized — even if useful)
--   - All breadcrumbs scoped to user_id, RLS-enforced
--   - Pattern cards are derived; cite their source breadcrumb_ids so
--     the owner can audit + delete provenance

-- ─── Ingestion sources ────────────────────────────────────────────────
-- One row per OAuth/upload connection. Tracks last sync + source-side
-- cursors so we can do incremental ingestion.

CREATE TABLE IF NOT EXISTS ingestion_sources (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type      TEXT         NOT NULL CHECK (source_type IN ('slack', 'gmail', 'zoom_transcript', 'notion', 'manual_upload')),
  source_label     TEXT,                                  -- human label, e.g. "Acme Co Slack workspace"
  oauth_state      JSONB,                                 -- encrypted tokens + scopes
  last_synced_at   TIMESTAMPTZ,
  cursor           JSONB,                                 -- per-source sync cursor (last message ts, etc.)
  status           TEXT         NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'error')),
  last_error       TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ingestion_sources_user_idx ON ingestion_sources (user_id, source_type);

ALTER TABLE ingestion_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own ingestion sources"
  ON ingestion_sources FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Breadcrumbs ──────────────────────────────────────────────────────
-- One row per synthesised conversation/thread/meeting. The raw content
-- is NOT stored here — only a synthesised summary. Raw bytes stay with
-- the customer's source system or in a separate encrypted-at-rest archive
-- (to be added when full-file diorization is needed).

CREATE TABLE IF NOT EXISTS breadcrumbs (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id            UUID         REFERENCES ingestion_sources(id) ON DELETE SET NULL,
  source_type          TEXT         NOT NULL,
  source_ref           TEXT,                                  -- e.g. "slack:C12345/p1747000000"
  occurred_at          TIMESTAMPTZ  NOT NULL,
  participants         TEXT[],                                -- email addresses or display names
  summary              TEXT         NOT NULL,                 -- 1-3 sentence synthesis
  tags                 TEXT[],                                -- ["margin-conversation", "client-acme"]
  embedding            VECTOR(1536),                          -- for cross-breadcrumb similarity
  consent_verified     BOOLEAN      NOT NULL DEFAULT FALSE,   -- third-party consent rule
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS breadcrumbs_user_occurred_idx ON breadcrumbs (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS breadcrumbs_user_tags_idx     ON breadcrumbs USING GIN (tags);
CREATE INDEX IF NOT EXISTS breadcrumbs_hnsw_cosine_idx
  ON breadcrumbs USING hnsw (embedding vector_cosine_ops);

ALTER TABLE breadcrumbs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own breadcrumbs"
  ON breadcrumbs FOR SELECT
  USING (auth.uid() = user_id);

-- ─── Pattern cards ────────────────────────────────────────────────────
-- Recurring patterns extracted from clusters of breadcrumbs. Refreshed
-- monthly by the pattern-detector job. Each card cites its source
-- breadcrumb_ids so the owner can drill down or delete provenance.

CREATE TABLE IF NOT EXISTS pattern_cards (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type        TEXT         NOT NULL,                 -- e.g. "q4-scope-expansion", "communication-style"
  title               TEXT         NOT NULL,                 -- "Client X has a Q4 scope-expansion pattern"
  description         TEXT         NOT NULL,
  source_breadcrumb_ids UUID[]     NOT NULL,                 -- audit trail
  confidence          NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  first_observed_at   TIMESTAMPTZ  NOT NULL,
  last_refreshed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,    -- false once stale or rejected
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pattern_cards_user_active_idx ON pattern_cards (user_id, is_active, last_refreshed_at DESC);

ALTER TABLE pattern_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own pattern cards"
  ON pattern_cards FOR SELECT
  USING (auth.uid() = user_id);

-- ─── Living briefs ────────────────────────────────────────────────────
-- One current brief per tenant (latest is canonical). Older briefs kept
-- for comparison / regeneration on model upgrades (Loop 3).

CREATE TABLE IF NOT EXISTS living_briefs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version       INT          NOT NULL,                       -- monotonically increasing per user
  brief_content TEXT         NOT NULL,                       -- 5-10 page markdown synthesis
  model_used    TEXT,                                        -- e.g. "gpt-4o-2024-08-06"
  prompt_version TEXT,                                       -- references coo/prompts/* version
  is_current    BOOLEAN      NOT NULL DEFAULT TRUE,
  generated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, version)
);

CREATE INDEX IF NOT EXISTS living_briefs_user_current_idx ON living_briefs (user_id, is_current);

ALTER TABLE living_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own living briefs"
  ON living_briefs FOR SELECT
  USING (auth.uid() = user_id);

-- When a new brief is marked current, the previous one should be marked not-current.
CREATE OR REPLACE FUNCTION living_briefs_ensure_single_current()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    UPDATE living_briefs
       SET is_current = FALSE
     WHERE user_id = NEW.user_id
       AND id != NEW.id
       AND is_current = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER living_briefs_single_current
  AFTER INSERT OR UPDATE OF is_current ON living_briefs
  FOR EACH ROW
  EXECUTE FUNCTION living_briefs_ensure_single_current();
