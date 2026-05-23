-- Postgres dashboard indexes — support the admin memory endpoints.
--
-- All additive, IF NOT EXISTS. Pure index DDL.
--
-- CONCURRENTLY note
-- -----------------
-- The migrate-pg runner wraps each file in a single transaction, and
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction. At sidecar
-- scale (<1M rows during Phase 2) the lock window of a plain CREATE INDEX
-- is sub-second. When the embeddings table approaches multi-million-row
-- territory, split future index migrations into their own files and run
-- them outside the transactional runner.

-- /admin/memory/health embeddings_by_kind aggregate:
--   SELECT source_kind, COUNT(*), MAX(created_at)
--     FROM embeddings WHERE active GROUP BY source_kind;
-- The existing idx_embeddings_owner_kind is partial on owner_user_id —
-- doesn't help an unowned global aggregate. This one covers it.
CREATE INDEX IF NOT EXISTS idx_embeddings_kind_created
  ON embeddings (source_kind, created_at DESC)
  WHERE active;

-- /admin/memory/pattern-cards: default sort is success_rate DESC NULLS
-- LAST filtered to active cards. The success_rate column is generated
-- STORED on pattern_cards (see 001_init.sql).
CREATE INDEX IF NOT EXISTS idx_pattern_cards_active_success
  ON pattern_cards (success_rate DESC NULLS LAST, id)
  WHERE archived_at IS NULL;

-- /admin/memory/health queue counts:
--   SELECT status, COUNT(*) FROM embedding_jobs GROUP BY status;
-- The existing idx_embedding_jobs_queue is partial WHERE status IN
-- ('queued','running'). A full-coverage index is needed once the table
-- grows past a few thousand rows, otherwise the GROUP BY across all
-- states sequential-scans the heap.
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status_created
  ON embedding_jobs (status, created_at);
