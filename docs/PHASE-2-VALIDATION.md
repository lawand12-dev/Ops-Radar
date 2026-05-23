# Phase 2 Week 1 — Sidecar Validation Runbook

Eleven steps, in order, with the SQL/commands to run, the output to expect,
and the rollback procedure for each. Don't skip ahead. Each step is
independently safe to repeat.

> **Pre-reqs**
> - Postgres 16+ instance reachable from the app (pgvector ships with PG 16 on
>   DO/Supabase/RDS managed offerings; verify the extension is installable).
> - `psql` (or any Postgres client) for the validation queries below.
> - The `chatv2` branch checked out with Phase 2 Week 1 commits.

---

## Step 1 — Verify pgvector extension is installable

This step runs **before** `migrate-pg`. We're confirming the host has the
extension available; the migration installs it via `CREATE EXTENSION`.

```bash
psql "$POSTGRES_URL" -c "SELECT name, default_version, installed_version
                          FROM pg_available_extensions
                          WHERE name IN ('vector','pg_trgm','pgcrypto');"
```

**Expected output** — three rows, with `default_version` populated for all
three. `installed_version` may be NULL (extensions aren't installed yet —
the migration does that):

```
   name   | default_version | installed_version
----------+-----------------+-------------------
 vector   | 0.7.x or newer  |
 pg_trgm  | 1.6             |
 pgcrypto | 1.3             |
```

**Failure**
- `vector` missing: the Postgres image doesn't have pgvector compiled in.
  Switch to a managed image that includes it (DO Managed Postgres, Supabase,
  Crunchy, Neon — all bundle it as of 2026). Don't try to apt-install
  pgvector on a hosted DB; you don't have the OS access.
- `default_version` shows but `installed_version` is non-NULL: someone
  already created the extension. Safe to proceed.

**Rollback** — nothing was changed; nothing to undo.

---

## Step 2 — Run `migrate-pg`

```bash
npm run migrate-pg
```

**Expected output**:

```
[migrate-pg] Found 1 migration file(s).
[migrate-pg] Applying 001_init.sql …
[migrate-pg] ✓ 001_init.sql
[migrate-pg] Done. Applied=1, Skipped=0.
```

**Failure**
- `POSTGRES_URL is not set. Aborting. EXIT=2` — set the env var.
- `extension "vector" is not available` — go back to Step 1.
- `permission denied to create extension` — the role lacks SUPERUSER. On
  managed Postgres you'll typically be given a role with `rds_superuser`
  (RDS) or equivalent that can `CREATE EXTENSION` from a curated allowlist.
  If pgvector isn't in your provider's allowlist, escalate.
- Any other DDL error — the whole migration rolls back atomically; the
  database is untouched. Read the error message and patch `001_init.sql`.

**Rollback** (full sidecar wipe — only if you need a clean re-run):
```sql
DROP TABLE IF EXISTS weekly_user_summaries, failure_cluster_hits,
                     failure_clusters, pattern_cards,
                     embedding_jobs, embeddings, schema_migrations CASCADE;
DROP FUNCTION IF EXISTS tg_set_updated_at();
DROP EXTENSION IF EXISTS vector;
DROP EXTENSION IF EXISTS pg_trgm;
DROP EXTENSION IF EXISTS pgcrypto;
```

---

## Step 3 — Validate tables / indexes / extensions

```sql
-- Extensions installed
SELECT extname, extversion FROM pg_extension
 WHERE extname IN ('vector','pg_trgm','pgcrypto')
 ORDER BY extname;

-- Expected: 3 rows.

-- Tables created
SELECT tablename FROM pg_tables
 WHERE schemaname = 'public'
   AND tablename IN ('embeddings','embedding_jobs','pattern_cards',
                     'failure_clusters','failure_cluster_hits',
                     'weekly_user_summaries','schema_migrations')
 ORDER BY tablename;

-- Expected: 7 rows.

-- HNSW index on embeddings.embedding present
SELECT indexname, indexdef FROM pg_indexes
 WHERE tablename = 'embeddings'
 ORDER BY indexname;

-- Expected: 4 indexes including idx_embeddings_vec_hnsw (USING hnsw)
-- and uniq_embeddings_source (UNIQUE … NULLS NOT DISTINCT)

-- embeddings.owner_user_id is NULLable (the bug we fixed)
SELECT column_name, is_nullable, data_type, udt_name
  FROM information_schema.columns
 WHERE table_name = 'embeddings'
   AND column_name IN ('owner_user_id','embedding')
 ORDER BY column_name;

-- Expected:
--   embedding      | NO   | USER-DEFINED | vector
--   owner_user_id  | YES  | uuid         | uuid

-- pattern_cards.success_rate is a generated column
SELECT column_name, is_generated, generation_expression
  FROM information_schema.columns
 WHERE table_name = 'pattern_cards' AND column_name = 'success_rate';

-- Expected: is_generated='ALWAYS', generation_expression references
-- matches_30d and deployed_30d.
```

**Failure** — re-run Step 2; if it fails again, your migration didn't
actually commit. Check `SELECT * FROM schema_migrations;` (it should have
one row: `001_init.sql`).

**Rollback** — see Step 2's rollback block.

---

## Step 4 — Enable `PATTERN_CARD_SYNC_ENABLED=true`

```bash
# In .env:
PATTERN_CARD_SYNC_ENABLED=true
# leave EMBEDDING_WORKER_ENABLED=false and HYBRID_RETRIEVAL_ENABLED=false
```

Restart the app:

```bash
npm run start
# OR: pm2 restart / systemctl restart, whatever your prod setup uses
```

**Expected output in logs** (within ~5s of boot):

```
[startup] Pattern card sync completed { "scanned": N, "unchanged": 0,
  "inserted_new": N, "bumped_version": 0, "archived_superseded": 0,
  "embedding_jobs_enqueued": N }
```

Where N is the number of pattern cards with frontmatter (currently 7 after
Phase 1 backfill).

**Failure**
- `Pattern card sync failed (non-fatal)` with `PG_NOT_CONFIGURED` —
  `POSTGRES_URL` isn't in the running process's env. Check your `.env`
  load order.
- `Pattern card sync failed (non-fatal)` with a DDL/role error — the
  process can connect but lacks permission on a table. Grant
  `INSERT,UPDATE,SELECT ON pattern_cards, embedding_jobs TO <role>`.

**Rollback** — set `PATTERN_CARD_SYNC_ENABLED=false`, restart, and:
```sql
DELETE FROM pattern_cards;
DELETE FROM embedding_jobs WHERE source_kind = 'pattern_card';
DELETE FROM embeddings WHERE source_kind = 'pattern_card';
```

---

## Step 5 — Verify cards landed in Postgres

```sql
SELECT id, version, output_kind, archived_at IS NULL AS active,
       array_length(triggers, 1) AS trigger_count
  FROM pattern_cards
 ORDER BY id;

-- Expected: one row per backfilled card.
--   workflow-invoicing-retainer  | 1 | workflow_json | t | 10
--   workflow-lead-routing-source | 1 | workflow_json | t | 10
--   workflow-meeting-followup    | 1 | workflow_json | t | 9
--   workflow-onboarding-seo      | 1 | workflow_json | t | 8
--   workflow-project-status      | 1 | workflow_json | t | 10
--   workflow-reporting-seo       | 1 | workflow_json | t | 11
--   workflow-slack-digest        | 1 | workflow_json | t | 9
```

And confirm embedding jobs were enqueued:

```sql
SELECT status, COUNT(*) FROM embedding_jobs
 WHERE source_kind = 'pattern_card'
 GROUP BY status ORDER BY status;

-- Expected: 'queued' = same N as above (until the worker runs).
```

---

## Step 6 — Enable `EMBEDDING_WORKER_ENABLED=true`

```bash
# In .env:
EMBEDDING_WORKER_ENABLED=true
```

Restart. The worker starts immediately and processes the queued jobs.

**Expected output in logs** (within ~10s):

```
[embedding-worker] Started { "worker_id": "worker-1", "batch_size": 32,
  "poll_interval_ms": 5000, "listener_attached": true }
[embedding-worker] Cycle complete { "trigger": "startup", "claimed": 7,
  "succeeded": 7, "failed": 0, "dead_lettered": 0, "duration_ms": ~600 }
```

If `claimed: 0`, the queue is empty — re-run pattern card sync manually
(re-enable + restart, or run the script standalone).

**Failure**
- `EMBED_CONFIG_MISSING` — `AI_API_KEY` is unset.
- `EMBED_REQUEST_FAILED` with `provider_status: 401` — API key wrong.
- `EMBED_DIM_MISMATCH` — the model returned a different dim than
  `AI_MODEL_EMBED_DIM`. Either update the env var to match the model's
  real dim and re-run `migrate-pg` with the corrected `vector(N)`
  column, or switch the model. The schema is hard-coded to 1024 today;
  if you need a different dim, update `001_init.sql` AND
  `AI_MODEL_EMBED_DIM` together.
- Jobs go to `status='failed'` then back to `'queued'`: that's the
  exponential-backoff retry loop. Watch `attempts`; rows that hit
  `EMBEDDING_MAX_ATTEMPTS` (default 8) move to `status='skipped'`
  (dead-letter).

**Rollback** — set `EMBEDDING_WORKER_ENABLED=false`, restart. Jobs stay
in the queue; you can re-enable later without re-syncing.

---

## Step 7 — Verify embedding_jobs queue drains correctly

Run repeatedly (every 5s) — counts should converge to `done`/0 queued:

```sql
SELECT status, COUNT(*) AS n,
       MIN(created_at) AS oldest,
       MAX(finished_at) AS latest_finished
  FROM embedding_jobs
 GROUP BY status ORDER BY status;
```

**Healthy steady state** (after ~30s for 7 pattern cards):
```
 status | n | oldest                | latest_finished
--------+---+-----------------------+-------------------------
 done   | 7 | 2026-05-23 …          | 2026-05-23 …
```

**Unhealthy signals**
- `running` rows with `locked_until < now()`: a worker died mid-batch.
  They'll be reclaimed on the next cycle (waiting for `locked_until` to
  pass — default 5 min).
- `failed` rows accumulating with high `attempts`: the embedding API is
  returning errors. Check the latest one:
  ```sql
  SELECT id, source_id, attempts, last_error
    FROM embedding_jobs
   WHERE status = 'failed'
   ORDER BY attempts DESC LIMIT 5;
  ```
- `skipped` rows: dead-lettered. Inspect `last_error` and decide whether
  to manually re-enqueue (DELETE + re-sync) or accept the loss.

---

## Step 8 — Verify embeddings rows are being written

```sql
SELECT source_kind, COUNT(*) AS n,
       MIN(created_at) AS first_written,
       MAX(created_at) AS last_written
  FROM embeddings
 GROUP BY source_kind ORDER BY source_kind;
```

**Healthy** — `pattern_card` row count matches the `done` count from Step 7.

```sql
-- Sanity check: vector dim and a spot peek
SELECT source_kind, source_id, source_version,
       array_length(string_to_array(trim(both '[]' from embedding::text), ','), 1) AS dim,
       LEFT(content, 80) AS content_excerpt
  FROM embeddings
 WHERE source_kind = 'pattern_card'
 ORDER BY source_id
 LIMIT 3;
```

`dim` MUST equal 1024 for every row. If not, the model is misconfigured
and Step 6 should have caught it — re-check.

---

## Step 9 — Benchmark embedding latency

```bash
# Single-input embeddings — measures API latency, not throughput
npm run bench-memory -- embed 20

# Vector search against the live HNSW index — measures index behavior
npm run bench-memory -- search 30 <your-tenant-uuid>

# Full orchestrator (embed + search + score) — end-to-end latency
HYBRID_RETRIEVAL_ENABLED=true npm run bench-memory -- hybrid 20 <your-tenant-uuid>
```

**Pass thresholds** (the script prints PASS/FAIL on each):

| Metric | Target |
|--------|--------|
| embed p50 | ≤ 500ms |
| embed p95 | ≤ 1500ms |
| search p50 | ≤ 40ms |
| search p95 | ≤ 200ms |
| hybrid p50 | ≤ 600ms |
| hybrid p95 | ≤ 2000ms |

**Failure decision tree**

- **embed p50 fails** (the most common case): the DO endpoint is slow
  for this model. Try `openai-text-embedding-3-small` against OpenAI
  directly — point `AI_BASE_URL` at `https://api.openai.com/v1` and
  use an OpenAI key. Or try `togethercomputer/m2-bert-80M-8k-retrieval`
  on Together — also OpenAI-compatible and historically fast.
- **search p50 fails** with <100k rows: HNSW recall knob `ef_search`
  is too high. Lower `HYBRID_RETRIEVAL_EF_SEARCH` from 64 → 32 and
  re-bench. With ~7 rows, search should be <5ms regardless.
- **hybrid p50 fails but embed/search both pass**: the orchestrator is
  doing too much work in JS (probably the `pattern_cards` quality
  lookup). Profile with `--inspect`; cache the quality map per process.

---

## Step 10 — Retrieval quality eval (THIS is the gate for Step 11)

```bash
# Reads from MySQL ai_interactions first, falls back to curated set
HYBRID_RETRIEVAL_ENABLED=true npm run eval-retrieval

# Force the curated 20-prompt set only:
HYBRID_RETRIEVAL_ENABLED=true npm run eval-retrieval -- --source=curated

# Or specify a tenant id for hybrid:
HYBRID_RETRIEVAL_ENABLED=true npm run eval-retrieval -- --tenant=<uuid>
```

**The script prints three pass/fail gates** at the end:

| Gate | Rule |
|------|------|
| 1 | `hybrid P@3 ≥ keyword P@3` (no precision regression) |
| 2 | `hybrid R@5 ≥ keyword R@5 + 0.05` (recall improves by ≥5pp) |
| 3 | `hybrid_only_wins ≥ keyword_only_wins` (net gain on hard prompts) |

**All three must pass** before moving to Step 11. If any fails:
- Check per-sample output — are there prompts where hybrid returns
  obviously-wrong cards? Inspect the `metadata @>` filters in the
  prompt; the wrong-card may have similar trigger words.
- Re-embed pattern cards (delete + re-sync) — sometimes the first
  embedding batch was noisy.
- If consistently failing on agency-specific prompts (e.g., "send a
  client invoice"), the pattern cards may need more trigger words. Edit
  the markdown frontmatter; sync re-embeds on next boot.

---

## Step 11 — Flip `HYBRID_RETRIEVAL_ENABLED=true` globally

**Pre-flight checklist** (all must be YES):
- [ ] Step 8: pattern_card embeddings row count ≥ pattern_cards row count
- [ ] Step 9: all bench targets pass
- [ ] Step 10: all 3 eval gates pass
- [ ] Workflow generation hasn't errored in the last hour (check logs)
- [ ] Embedding worker has zero queued jobs older than 10 minutes

**Then**:

```bash
# In .env:
HYBRID_RETRIEVAL_ENABLED=true
```

Restart. The orchestrator now uses semantic retrieval in the workflow
generator's system prompt assembly. **The keyword fallback still triggers
on any error**, so a Postgres outage doesn't fail workflow generation —
it degrades to Phase 1 behavior with a `hybrid-retrieval Keyword fallback
used` log line.

**Monitor for 1 hour after flip**:

```sql
-- Watch the `ai_interactions` table for outcome distribution shift.
-- A drop in 'deployed' rate vs the previous 24h would mean retrieval
-- regression made it into prod.
SELECT outcome, COUNT(*) FROM ai_interactions
 WHERE created_at > now() - interval '1 hour'
 GROUP BY outcome ORDER BY outcome;
```

Also watch logs for:
- `hybrid-retrieval Keyword fallback used` — should be 0 in a healthy
  state; >5% of calls means Postgres/embedding is degraded.
- `embedding-worker Cycle crashed` — should be 0.
- `hybrid-retrieval embedAndSearch failed` — should be 0.

**Rollback** — single env var flip:

```bash
HYBRID_RETRIEVAL_ENABLED=false
```

Restart. No data needs to be touched. Workflow generation immediately
reverts to Phase 1 keyword selector. Pattern cards remain in Postgres;
embedding worker keeps draining its queue (harmless). To stop the worker
too: `EMBEDDING_WORKER_ENABLED=false` + restart.

---

## What "done" looks like

- Steps 1–8: pass once. Schema and data are in place.
- Step 9: pass once before Step 11. Re-run quarterly or when model changes.
- Step 10: pass once before Step 11. Re-run after every batch of pattern
  card edits or when you suspect retrieval drift.
- Step 11: flipped. Phase 2 Week 1 is live.

After this runbook is complete, we evaluate Phase 2 Week 2: wiring
hybrid retrieval into the **failure analyzer** (semantic failure-cluster
recall) and the **COO loop scaffold** (per-tenant memory injection for
"what happened this week" questions).
