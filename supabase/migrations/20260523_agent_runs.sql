-- Audit log of every agent run. Used by /dashboard/agents and for cost / outcome tracking.

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_slug text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'success', 'failed', 'skipped')),
  summary text,
  actions_taken int not null default 0,
  patterns_detected int not null default 0,
  risks_flagged int not null default 0,
  notion_writes int not null default 0,
  tokens_used int,
  cost_cents int,
  error_message text
);

create index if not exists agent_runs_user_started_idx
  on agent_runs (user_id, started_at desc);

create index if not exists agent_runs_slug_started_idx
  on agent_runs (agent_slug, started_at desc);

alter table agent_runs enable row level security;

create policy "users read own agent runs"
  on agent_runs
  for select
  using (auth.uid() = user_id);
