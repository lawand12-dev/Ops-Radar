-- CP-20: Customer automations (Lindy-style automations layer).
-- See docs/strategy/automations-architecture-2026.md for the full design.
--
-- Four tables:
--   1. customer_automations       — the definition (what the customer wired up)
--   2. automation_trigger_instances — maps OpsRadar automations to Composio ti_* IDs
--   3. automation_runs            — one row per fired execution
--   4. automation_event_idempotency — dedupe Composio webhook retries

-- ─── 1. customer_automations ──────────────────────────────────────────────

create table if not exists customer_automations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  slug            text not null,                       -- e.g. 'notify-pm-on-closed-won'
  name            text not null,                       -- human-readable name
  description     text not null,                       -- one-liner injected into every agent prompt
  status          text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  -- Trigger config (denormalized for fast routing)
  trigger_kind    text not null
    check (trigger_kind in ('composio_event', 'schedule', 'manual', 'webhook', 'chat')),
  trigger_toolkit text,                                -- 'hubspot', null for non-event
  trigger_slug    text,                                -- e.g. 'HUBSPOT_DEAL_STAGE_UPDATED_TRIGGER'
  trigger_filter  jsonb not null default '{}'::jsonb,  -- {"deal_stage": "closedwon", "amount_gte": 5000}
  -- The executable plan
  spec            jsonb not null,
  spec_version    int not null default 1,
  autonomy        text not null default 'ask'
    check (autonomy in ('ask', 'auto', 'off')),
  -- Metadata
  source          text not null default 'coo-chat'
    check (source in ('coo-chat', 'template', 'manual')),
  source_session  uuid,                                -- coo_chat_sessions.id if from chat
  created_by      text not null default 'customer',
  last_run_at     timestamptz,
  last_run_status text,
  run_count       int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(user_id, slug)
);

create index if not exists customer_automations_user_status_idx
  on customer_automations (user_id, status);

-- THE critical lookup index: "does any active automation match this incoming event?"
create index if not exists customer_automations_active_trigger_idx
  on customer_automations (user_id, trigger_kind, trigger_toolkit, trigger_slug)
  where status = 'active';

alter table customer_automations enable row level security;

create policy "users read own automations"
  on customer_automations
  for select
  using (auth.uid() = user_id);

create policy "users insert own automations"
  on customer_automations
  for insert
  with check (auth.uid() = user_id);

create policy "users update own automations"
  on customer_automations
  for update
  using (auth.uid() = user_id);

create policy "users delete own automations"
  on customer_automations
  for delete
  using (auth.uid() = user_id);

-- ─── 2. automation_trigger_instances ──────────────────────────────────────

create table if not exists automation_trigger_instances (
  id                    uuid primary key default gen_random_uuid(),
  automation_id         uuid not null references customer_automations(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  composio_trigger_id   text not null,                  -- 'ti_xxxxx' from Composio
  trigger_slug          text not null,
  connected_account_id  text not null,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  unique(composio_trigger_id)
);

create index if not exists automation_trigger_instances_user_slug_idx
  on automation_trigger_instances (user_id, trigger_slug)
  where is_active = true;

alter table automation_trigger_instances enable row level security;

create policy "users read own trigger instances"
  on automation_trigger_instances
  for select
  using (auth.uid() = user_id);

-- ─── 3. automation_runs ────────────────────────────────────────────────────

create table if not exists automation_runs (
  id                uuid primary key default gen_random_uuid(),
  automation_id     uuid not null references customer_automations(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  trigger_event     jsonb not null,                       -- the Composio payload or schedule ctx
  status            text not null default 'running'
    check (status in ('running', 'succeeded', 'failed', 'awaiting_approval')),
  result            jsonb,
  error             text,
  steps             jsonb not null default '[]'::jsonb,   -- compact step trace
  queued_action_ids uuid[] not null default '{}',         -- cross-link to agent_actions
  started_at        timestamptz not null default now(),
  finished_at       timestamptz
);

create index if not exists automation_runs_automation_started_idx
  on automation_runs (automation_id, started_at desc);

create index if not exists automation_runs_user_status_idx
  on automation_runs (user_id, status, started_at desc);

alter table automation_runs enable row level security;

create policy "users read own automation runs"
  on automation_runs
  for select
  using (auth.uid() = user_id);

-- ─── 4. automation_event_idempotency ──────────────────────────────────────

-- Dedupe Composio webhook retries (Composio retries on non-2xx; we get the
-- same webhook-id multiple times). TTL prune > 7 days via a periodic job.
create table if not exists automation_event_idempotency (
  webhook_id      text primary key,
  received_at     timestamptz not null default now(),
  automation_ids  uuid[] not null
);

create index if not exists automation_event_idempotency_received_idx
  on automation_event_idempotency (received_at);

-- System-internal dedupe table — written only by the webhook handler via
-- the service role. Block anon + authenticated; service role bypasses RLS.
alter table automation_event_idempotency enable row level security;
