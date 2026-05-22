-- RPC: per-user cosine-similarity nearest-neighbour search over breadcrumbs.
-- Called by searchBrain() in src/lib/coo/brain-search.ts.
--
-- Scoped to a single user via the target_user_id parameter — never returns
-- cross-tenant data even if the calling code has a bug.
--
-- Returns top-N matches sorted by similarity desc. Excludes breadcrumbs
-- without an embedding (consent-skipped + synthesis-failed rows).

CREATE OR REPLACE FUNCTION match_breadcrumbs_for_user(
  target_user_id  UUID,
  query_embedding VECTOR(1536),
  match_count     INT DEFAULT 10
)
RETURNS TABLE (
  id          UUID,
  occurred_at TIMESTAMPTZ,
  summary     TEXT,
  tags        TEXT[],
  source_type TEXT,
  similarity  FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    occurred_at,
    summary,
    tags,
    source_type,
    1 - (embedding <=> query_embedding) AS similarity
  FROM breadcrumbs
  WHERE user_id = target_user_id
    AND embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
