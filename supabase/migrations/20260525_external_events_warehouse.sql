-- CP-25: Three-tier memory — Tier 2 (raw event warehouse).
--
-- Where 5 years of raw history per customer lives: every Stripe transaction,
-- HubSpot deal stage change, Harvest time entry, ClickUp task update, etc.
-- The AI agents query this for "show me Q3 2024 overdue invoices" and
-- "MRR trend over 3 quarters" — questions that the curated Notion brain
-- can't answer at row granularity.
--
-- v1 schema: vanilla Postgres + carefully chosen indexes. At ~50M rows
-- (roughly 50 paying customers), migrate to monthly partitioning by
-- adding RANGE partitioning on occurred_at — a one-time backfill migration.
-- See docs/strategy/three-tier-memory-architecture-2026.md for the full design.

create table if not exists external_events (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  source              text not null,                       -- 'stripe', 'hubspot', 'harvest', 'clickup', etc.
  event_type          text not null,                       -- 'invoice.paid', 'deal.stage_updated', etc.
  external_id         text not null,                       -- source-system id for dedupe (e.g. Stripe 'in_abc123')
  occurred_at         timestamptz not null,                -- when it happened in the source system
  amount_cents        bigint,                              -- hot field promoted out of payload for fast SUM
  client_external_id  text,                                -- hot field — the client this event belongs to
  payload             jsonb not null,                      -- full raw event for AI drill-down
  created_at          timestamptz not null default now()
);

-- ─── Indexes — designed for the agent's 3 dominant query patterns ──────────

-- Pattern 1: "Last 90 days of [source] events for this user" — time-range scan
create index if not exists external_events_user_source_time_idx
  on external_events (user_id, source, occurred_at desc);

-- Pattern 2: "Everything we know about this specific client over X period"
create index if not exists external_events_user_client_time_idx
  on external_events (user_id, client_external_id, occurred_at desc)
  where client_external_id is not null;

-- Pattern 3: "All invoice.paid events this quarter" — typed time-range
create index if not exists external_events_user_type_time_idx
  on external_events (user_id, source, event_type, occurred_at desc);

-- Dedupe: a single (user, source, external_id) is unique — webhook retries
-- or re-runs of the historical backfill don't double-write.
create unique index if not exists external_events_dedup_idx
  on external_events (user_id, source, external_id);

-- ─── RLS — every customer sees only their own events ───────────────────────

alter table external_events enable row level security;

create policy "users read own events"
  on external_events
  for select
  using (auth.uid() = user_id);

-- Writes happen via service-role only (server-side cron agents + webhook
-- handlers). No insert/update/delete policy for end-users.
