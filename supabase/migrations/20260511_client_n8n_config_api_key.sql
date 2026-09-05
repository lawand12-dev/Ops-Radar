-- Add n8n REST API key column for workflow CRUD + monitoring.
-- Distinct from n8n_webhook_secret (used by dashboard widget reads).
alter table public.client_n8n_config
  add column if not exists n8n_api_key text;

comment on column public.client_n8n_config.n8n_api_key is
  'n8n REST API key for the customer''s instance. Used by chat service to deploy/edit workflows and by admin tools.';
