-- API-key integrations: add lifecycle columns to the existing integrations
-- table. The encrypted_token/iv/auth_tag columns continue to store the
-- customer-supplied API key (encrypted AES-256-GCM, base64-encoded).

alter table public.integrations
  add column if not exists status text not null default 'connected'
    check (status in ('connected','requires_reconnect','revoked')),
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_error text,
  add column if not exists external_account_id text;

comment on column public.integrations.status is
  'connected = healthy. requires_reconnect = 401 from provider on last fetch. revoked = team-marked.';
comment on column public.integrations.last_synced_at is
  'Timestamp of the most recent successful live fetch from the provider.';
comment on column public.integrations.last_error is
  'Last redacted error message observed when fetching, if any.';
comment on column public.integrations.external_account_id is
  'Provider-side identifier discovered during validation (e.g. Stripe account.id, HubSpot portal id).';

-- Ensure the upsert key (client_id, tool) is unique — the existing table
-- may already have this; the constraint is idempotent.
create unique index if not exists integrations_client_tool_unique
  on public.integrations (client_id, tool);
