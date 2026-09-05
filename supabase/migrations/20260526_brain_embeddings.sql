-- CP-35 — pgvector enablement for the Brain (Apprentice Mode).
--
-- Adds embedding columns to brain_document_versions so that each new commit
-- of a curated path (pattern-cards/, decision-log/, risk-register/, and
-- per-employee learned-rules) is searchable by semantic similarity.
--
-- Why versions and not the pointer table:
--   The version row is immutable + content-addressable. The pointer
--   (brain_documents.current_version_id) just rotates between versions,
--   so the embedding naturally follows the latest content via JOIN.
--
-- Why ONLY curated paths get the HNSW index:
--   per docs/strategy/three-tier-memory-architecture-2026.md §Adjustment 2 —
--   embedding every single brain doc (clients/, projects/, agent-runs/, etc.)
--   would burn OpenAI credits + bloat the index without measurable retrieval
--   gain. The curated set is small + high-signal.
--
-- Apply via mcp__claude_ai_Supabase__apply_migration after writing.

-- ─── 1. Enable pgvector ──────────────────────────────────────────────────

create extension if not exists vector;

-- ─── 2. Add embedding columns to brain_document_versions ─────────────────

alter table brain_document_versions
  add column if not exists embedding vector(1536),
  add column if not exists embedding_model text default 'text-embedding-3-small';

-- ─── 3. HNSW index — ONLY on curated paths ───────────────────────────────
--
-- HNSW is the post-PMF default for pgvector at our scale (Karpathy/Supabase
-- 2026 guidance). The partial WHERE keeps the index small even as version
-- history accumulates.

create index if not exists idx_brain_document_versions_embedding
  on public.brain_document_versions
  using hnsw (embedding vector_cosine_ops)
  where path ~ '^(pattern-cards/|decision-log/|risk-register/|employees/[^/]+/learned-rules/)';

-- ─── 4. RPC: match_brain_documents ───────────────────────────────────────
--
-- Returns the top-K most semantically similar CURRENT-version documents for
-- a given user, optionally filtered by a path prefix. RLS-safe: the caller
-- passes the user_id explicitly (this function is called from the service
-- role on the server, never directly from the browser). The TS caller
-- (semanticSearchBrain in src/lib/brain/store.ts) is responsible for always
-- passing the authenticated user's id.

create or replace function match_brain_documents(
  target_user_id uuid,
  query_embedding vector(1536),
  match_count int default 5,
  path_prefix text default null
)
returns table(path text, content text, similarity float)
language sql
stable
as $$
  select
    bdv.path,
    bdv.content,
    1 - (bdv.embedding <=> query_embedding) as similarity
  from brain_documents bd
  join brain_document_versions bdv on bdv.id = bd.current_version_id
  where bd.user_id = target_user_id
    and bdv.embedding is not null
    and (path_prefix is null or bdv.path like path_prefix || '%')
  order by bdv.embedding <=> query_embedding
  limit match_count;
$$;

comment on function match_brain_documents is
  'CP-35 Apprentice Mode: semantic search over the curated subset of a customer''s brain. ' ||
  'Caller MUST pass the authenticated user_id — function trusts the parameter.';
