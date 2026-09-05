-- Composio-backed integration connections.
-- Replaces per-tool API key storage (was: src/lib/integrations/crypto.ts + encrypted columns).
-- Composio holds the OAuth tokens; we only persist the connection id.

create table if not exists composio_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_slug text not null,                       -- 'stripe', 'hubspot', 'gmail', 'notion', etc.
  composio_connection_id text not null,
  connected_at timestamptz not null default now(),
  last_used_at timestamptz,
  is_active boolean not null default true,       -- flips to true when Composio webhook confirms OAuth completed
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, tool_slug)
);

create index if not exists composio_connections_user_idx
  on composio_connections (user_id);

create index if not exists composio_connections_active_idx
  on composio_connections (user_id, is_active) where is_active = true;

alter table composio_connections enable row level security;

create policy "users own composio connections"
  on composio_connections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
