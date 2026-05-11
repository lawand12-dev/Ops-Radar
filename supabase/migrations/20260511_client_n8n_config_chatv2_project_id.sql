-- Add the chatv2 project ID mapping for the Workflow Health page.
-- One chatv2 project per OpsRadar customer; populated manually by the team
-- after creating the project in chatv2 admin at opstest.atta.codes.
alter table public.client_n8n_config
  add column if not exists chatv2_project_id text;

comment on column public.client_n8n_config.chatv2_project_id is
  'chatv2 project UUID (from opstest.atta.codes) that owns this customers
   n8n monitoring. Set manually by the team during onboarding. Null = workflow
   health is not yet enabled for this customer.';
