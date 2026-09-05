-- Knowledge base semantic search: vector embeddings of every KB chunk.
-- Replaces keyword-only retrieval in retrieveCooKnowledge() with a hybrid
-- (semantic + keyword) ranking — the Tier-1 (static knowledge) layer of
-- the 3-tier hybrid GraphRAG described in ai-native-company-2026.md.
--
-- Embedding model: OpenAI text-embedding-3-small (1536 dimensions).
--   - $0.02 per 1M tokens
--   - Default for OpsRadar; switch to text-embedding-3-large (3072) only
--     if recall becomes an issue at >10K chunks.
--
-- Chunking strategy: one row per KB markdown FILE today (the files are
-- already chunk-sized per the existing frontmatter convention). When a
-- file grows past ~8K tokens, we'll split per H2 in a future migration.

CREATE TABLE IF NOT EXISTS kb_embeddings (
  id                BIGSERIAL    PRIMARY KEY,
  source_file       TEXT         NOT NULL UNIQUE,
  category          TEXT,
  title             TEXT,
  summary           TEXT,
  content_preview   TEXT,          -- first ~500 chars for quick read
  content_hash      TEXT         NOT NULL,  -- sha256 of full content; lets us skip re-embedding
  embedding         VECTOR(1536) NOT NULL,
  embedded_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- HNSW index for cosine-similarity nearest-neighbour queries.
-- ivfflat is the legacy alternative; HNSW is the current default in
-- pgvector 0.8 for accuracy + recall.
CREATE INDEX IF NOT EXISTS kb_embeddings_hnsw_cosine_idx
  ON kb_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS kb_embeddings_category_idx
  ON kb_embeddings (category);

-- KB content is public (the same agency-ops research everyone sees);
-- no per-user scoping needed. Admin-only writes via service role.
ALTER TABLE kb_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "KB embeddings are readable by authenticated users"
  ON kb_embeddings FOR SELECT
  TO authenticated
  USING (true);
