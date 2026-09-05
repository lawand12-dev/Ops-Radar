-- Per-user, per-agent on/off + last-run status.
-- One row per (user, agent_slug). 10 possible slugs:
-- revenue | collections | scope | delivery | briefing | profitability | team | growth | renewal | stack

create table if not exists agent_config (
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_slug text not null,
  is_enabled boolean not null default true,
  last_run_at timestamptz,
  last_run_status text,                          -- 'success' | 'failed' | 'skipped'
  custom_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, agent_slug)
);

alter table agent_config enable row level security;

create policy "users own agent config"
  on agent_config
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
