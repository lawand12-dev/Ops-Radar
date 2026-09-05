-- The customer's connected Notion workspace and the 20 databases OpsRadar creates inside it.
-- Notion is the Brain: customer-owned memory layer.

create table if not exists notion_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_id text not null,
  workspace_name text,
  bot_id text,
  access_token_encrypted text not null,          -- AES-256-GCM via existing crypto helper
  parent_page_id text not null,                  -- the "OpsRadar Brain" parent page id
  databases jsonb not null default '{}'::jsonb,  -- { clients: 'db_id', kpi_snapshots: 'db_id', ... }
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  backfill_status text not null default 'pending'
    check (backfill_status in ('pending', 'phase1', 'phase2', 'phase3', 'complete', 'failed')),
  backfill_error text
);

alter table notion_workspaces enable row level security;

create policy "users own notion workspace"
  on notion_workspaces
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
