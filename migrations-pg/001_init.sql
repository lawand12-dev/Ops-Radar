-- ===========================================================================
-- Phase 2 Week 1 — Postgres intelligence sidecar, initial schema.
--
-- Scope
--   This database is the memory/retrieval/embedding store ONLY. MySQL
--   remains the operational system of record (projects, workflows, events,
--   etc.). There are no foreign keys back to MySQL — the bridge is
--   `owner_user_id` as a uuid column, populated from MySQL `users.id`.
--
-- Karpathy-style memory tiers, mapped to physical tables:
--   episodic   — embeddings(source_kind='breadcrumb'|'ai_interaction')
--   procedural — pattern_cards + embeddings(source_kind='pattern_card')
--   semantic   — failure_clusters + failure_cluster_hits
--                + embeddings(source_kind='failure_cluster')
--   long-term  — weekly_user_summaries
--                + embeddings(source_kind='weekly_summary')
--   working    — process memory only (not persisted)
--
-- Tenant isolation
--   Every row that represents tenant data carries owner_user_id NOT NULL.
--   Application code (src/modules/memory/*) enforces WHERE owner_user_id = ?
--   on every retrieval. RLS is intentionally NOT enabled in Phase 2;
--   it's a Stage B (full migration) concern.
--   failure_clusters is cross-tenant by design (semantic memory pooled
--   across the platform); failure_cluster_hits IS tenant-stamped.
-- ===========================================================================

-- ----- Extensions ---------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- trigram (hybrid keyword + content_trgm idx)
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid + digest


-- ----- Embeddings ----------------------------------------------------------
-- One polymorphic table holds every embedding. Source kind discriminates;
-- the unique key allows idempotent UPSERT (same content + chunk + version
-- always lands in the same row).
--
-- dim = 1024 matches the default for DO/OpenAI text-embedding-3-small
-- equivalents. Changing dim later is a re-embed (drop+rebuild rows of the
-- affected kind), not a schema migration.

CREATE TABLE IF NOT EXISTS embeddings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULLABLE: global procedural memory kinds (pattern_card) have no
  -- owner; semantic memory kinds (failure_cluster) are cross-tenant by
  -- design and stored without an owner too. Tenant-stamped kinds
  -- (breadcrumb, ai_interaction, weekly_summary, workflow_topology) are
  -- enforced as NOT NULL at the producer boundary in embedding-jobs.ts
  -- (`assertTenantInvariant`).
  owner_user_id   uuid NULL,
  source_kind     text NOT NULL CHECK (source_kind IN (
                    'pattern_card',
                    'breadcrumb',
                    'ai_interaction',
                    'failure_cluster',
                    'weekly_summary',
                    'workflow_topology'
                  )),
  source_id       text NOT NULL,                 -- origin id, kind-specific
  source_version  int  NOT NULL DEFAULT 1,       -- bumps on re-embed
  chunk_idx       int  NOT NULL DEFAULT 0,
  content         text NOT NULL,
  content_hash    bytea NOT NULL,                -- sha256(content)
  embedding       vector(1024) NOT NULL,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Idempotent UPSERT key. Re-embedding the same source_id/version/chunk
-- replaces the row. NULLS NOT DISTINCT (Postgres 15+) treats NULL owner
-- as a single value so global rows still collide on the same (kind,
-- source_id, chunk, version) tuple and UPSERT correctly.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_embeddings_source
  ON embeddings (owner_user_id, source_kind, source_id, chunk_idx, source_version)
  NULLS NOT DISTINCT;

-- Filter index for the hot retrieval predicate:
--   WHERE owner_user_id = ? AND source_kind = ANY(?) AND active
CREATE INDEX IF NOT EXISTS idx_embeddings_owner_kind_active
  ON embeddings (owner_user_id, source_kind)
  WHERE active;

-- Trigram on content for the keyword half of hybrid retrieval. The full
-- hybrid query joins vector cosine + ts_rank_cd; gin_trgm_ops gives us
-- the same recall floor when the tokenizer misses but characters overlap.
CREATE INDEX IF NOT EXISTS idx_embeddings_content_trgm
  ON embeddings USING gin (content gin_trgm_ops);

-- JSONB metadata is queried for filtering (e.g., card.intent, breadcrumb
-- workflow_id). jsonb_path_ops is smaller and faster than the default
-- jsonb_ops when we only do `@>` containment queries.
CREATE INDEX IF NOT EXISTS idx_embeddings_metadata_gin
  ON embeddings USING gin (metadata jsonb_path_ops);

-- HNSW ANN index for cosine similarity. m and ef_construction are the
-- recommended starting values for the 1024-dim, ≤10M-row regime. Recall
-- is tunable at query time via SET LOCAL hnsw.ef_search = N.
--
-- NOTE: index build is single-pass O(N log N). On a fresh empty table it
-- costs nothing; reindexing 10M rows is ~30 min on modest hardware.
CREATE INDEX IF NOT EXISTS idx_embeddings_vec_hnsw
  ON embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);


-- ----- Embedding jobs (durable queue) -------------------------------------
-- Postgres-as-queue using FOR UPDATE SKIP LOCKED + LISTEN/NOTIFY. We do
-- NOT introduce Redis/SQS for one queue.
--
-- Idempotency
--   Producers UPSERT on (source_kind, source_id, source_version). Re-enqueuing
--   the same triple while a job is pending just updates payload.
--
-- Worker contract (src/modules/memory/embedding-worker.ts):
--   1) BEGIN
--   2) SELECT … FOR UPDATE SKIP LOCKED LIMIT N
--      UPDATE status='running', locked_by=$1, locked_until=now()+interval
--      RETURNING …
--   3) Call embedding API (batched)
--   4) UPSERT into embeddings
--   5) UPDATE embedding_jobs SET status='done', finished_at=now()
--   6) COMMIT
-- Crash-safe: an unfinished txn rolls back the UPDATE; the job becomes
-- claimable again once locked_until expires.

CREATE TABLE IF NOT EXISTS embedding_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid,                          -- nullable for global kinds (pattern_card)
  source_kind     text NOT NULL,
  source_id       text NOT NULL,
  source_version  int  NOT NULL DEFAULT 1,
  payload         jsonb NOT NULL,                -- {content, metadata, ...}
  status          text NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','running','done','failed','skipped')),
  attempts        int  NOT NULL DEFAULT 0,
  last_error      text,
  locked_by       text,                          -- worker id during running state
  locked_until    timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz
);

-- Producer-side dedup. Re-enqueuing while a job is in-flight overwrites
-- the payload; once done/skipped a new enqueue creates a fresh row.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_embedding_jobs_pending
  ON embedding_jobs (source_kind, source_id, source_version)
  WHERE status IN ('queued','running');

-- Worker-side claim index.
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_claim
  ON embedding_jobs (status, next_attempt_at)
  WHERE status IN ('queued','running');


-- ----- Pattern cards (procedural memory) ----------------------------------
-- The markdown files in knowledge-base/patterns/*.md remain the source of
-- truth for human authoring. A sync job (src/modules/memory/pattern-card-
-- sync.ts) hashes each card body and UPSERTs into this table. Version is
-- bumped on content change; embedding jobs are enqueued at the new version.
--
-- Telemetry counters (matches_30d, deployed_30d, rejected_30d) are
-- maintained by a nightly job from MySQL ai_interactions.matched_pattern_ids
-- joined against outcome. success_rate is a generated column.

CREATE TABLE IF NOT EXISTS pattern_cards (
  id              text NOT NULL,
  version         int  NOT NULL,
  intent          text,
  triggers        text[] NOT NULL DEFAULT '{}',
  tools           text[] NOT NULL DEFAULT '{}',
  output_kind     text NOT NULL CHECK (output_kind IN
                    ('workflow_json','coo_playbook','failure_playbook')),
  body            text NOT NULL,
  body_hash       bytea NOT NULL,                -- sha256(body); change detector
  source_path     text NOT NULL,                 -- relative path of the .md
  matches_30d     int  NOT NULL DEFAULT 0,
  deployed_30d    int  NOT NULL DEFAULT 0,
  rejected_30d    int  NOT NULL DEFAULT 0,
  success_rate    numeric(5,4) GENERATED ALWAYS AS (
                    CASE
                      WHEN matches_30d > 0
                      THEN deployed_30d::numeric / matches_30d
                      ELSE NULL
                    END
                  ) STORED,
  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, version)
);

CREATE INDEX IF NOT EXISTS idx_pattern_cards_active_kind
  ON pattern_cards (output_kind)
  WHERE archived_at IS NULL;


-- ----- Failure clusters (semantic memory, cross-tenant) -------------------
-- A normalized error fingerprint defines a cluster. New failures with the
-- same fingerprint increment hit_count + insert into failure_cluster_hits.
-- Per-tenant insertion uses a Postgres advisory lock keyed by the
-- fingerprint hash to serialize the "new cluster" race.
--
-- known_remedies is a jsonb array of {remedy, attempted, succeeded,
-- last_used_at} entries — updated as the failure analyzer proposes fixes
-- and operators accept/reject them. The retrieval layer ranks remedies
-- by succeeded/attempted ratio.
--
-- Tenants who opt out of cross-tenant pooling (users.share_failure_intelligence
-- = false in MySQL) get filtered to their own hits only by the
-- application layer.

CREATE TABLE IF NOT EXISTS failure_clusters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint     text NOT NULL,
  exemplar_text   text NOT NULL,                 -- cleanest representative
  first_seen      timestamptz NOT NULL DEFAULT now(),
  last_seen       timestamptz NOT NULL DEFAULT now(),
  hit_count       int  NOT NULL DEFAULT 1,
  tenant_count    int  NOT NULL DEFAULT 1,       -- distinct owners affected
  known_remedies  jsonb NOT NULL DEFAULT '[]'::jsonb,
  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_failure_fingerprint
  ON failure_clusters (fingerprint);

CREATE INDEX IF NOT EXISTS idx_failure_clusters_active
  ON failure_clusters (last_seen DESC)
  WHERE archived_at IS NULL;


CREATE TABLE IF NOT EXISTS failure_cluster_hits (
  id              bigserial PRIMARY KEY,
  cluster_id      uuid NOT NULL REFERENCES failure_clusters(id) ON DELETE CASCADE,
  owner_user_id   uuid NOT NULL,
  workflow_id     text NOT NULL,                  -- MySQL workflows.id (CHAR(36))
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  raw_error       text NOT NULL,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_fch_cluster_time
  ON failure_cluster_hits (cluster_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_fch_tenant_time
  ON failure_cluster_hits (owner_user_id, occurred_at DESC);


-- ----- Weekly user summaries (long-term memory) ---------------------------
-- One row per tenant per ISO week. Body is a compressed paragraph (≤500
-- tokens) produced by the weekly summarizer job. metrics carries the
-- numeric snapshot the COO prompt cites.

CREATE TABLE IF NOT EXISTS weekly_user_summaries (
  owner_user_id   uuid NOT NULL,
  week_start      date NOT NULL,                  -- Monday of the ISO week
  summary         text NOT NULL,
  metrics         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_user_id, week_start)
);


-- ----- Generic updated_at trigger -----------------------------------------
-- One function, reused per table that has updated_at. Pattern_cards uses it
-- on UPDATE; the other tables in this migration are append-only.

CREATE OR REPLACE FUNCTION tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pattern_cards_updated_at ON pattern_cards;
CREATE TRIGGER pattern_cards_updated_at
  BEFORE UPDATE ON pattern_cards
  FOR EACH ROW
  EXECUTE FUNCTION tg_set_updated_at();
