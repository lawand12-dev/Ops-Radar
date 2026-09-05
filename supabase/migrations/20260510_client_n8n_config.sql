-- Per-client n8n instance config for dashboard multi-tenancy.
-- Config only — no business data. One row per onboarded client.

create table if not exists public.client_n8n_config (
  client_id             uuid primary key
                          references auth.users(id) on delete cascade,
  n8n_base_url          text not null,
  n8n_webhook_secret    text not null,
  backfill_completed_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.client_n8n_config is
  'One row per onboarded client — their self-hosted n8n instance URL and
   webhook secret. Config only; no business data is stored here.';

comment on column public.client_n8n_config.n8n_webhook_secret is
  'Shared secret sent as x-opsradar-secret on every webhook call.';

comment on column public.client_n8n_config.backfill_completed_at is
  'Set when historical import finishes. Null means backfill is pending.';

create or replace function public.client_n8n_config_set_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists trg_client_n8n_config_updated_at on public.client_n8n_config;
create trigger trg_client_n8n_config_updated_at
  before update on public.client_n8n_config
  for each row
  execute function public.client_n8n_config_set_updated_at();

alter table public.client_n8n_config enable row level security;

drop policy if exists "block_all_anon" on public.client_n8n_config;
create policy "block_all_anon"
  on public.client_n8n_config
  as permissive
  for all
  to anon
  using (false)
  with check (false);
