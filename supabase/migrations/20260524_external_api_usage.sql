-- CP-23: Multi-tenant external API usage tracking + per-customer quota.
--
-- Every call to a shared third-party API (Tavily, OpenAI, Anthropic)
-- is logged here with the user_id, so we can: (a) attribute cost per customer,
-- (b) enforce per-tier monthly caps, (c) show usage in /dashboard/settings/usage,
-- (d) build usage-based pricing later if we want.

create table if not exists external_api_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Normalized provider name. Add new ones as we add APIs.
  provider text not null check (provider in ('openai', 'tavily', 'anthropic')),
  -- Free-form operation tag — e.g. 'web_search', 'research_competitor',
  -- 'analyze_document', 'agent_chat', 'tool_execute', 'briefing_generate'.
  operation text not null,
  -- Provider-native unit (Tavily credits = 1, etc.)
  credits_used numeric not null default 0,
  -- OpenAI / Anthropic only — sum of input + output tokens.
  tokens_used integer,
  -- Our $ cost estimate in USD cents (best-effort, may be 0).
  cost_estimate_cents numeric,
  -- Optional debug metadata (model name, query length, etc.). Cap at ~2KB.
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists external_api_usage_user_provider_occurred_idx
  on external_api_usage (user_id, provider, occurred_at desc);

create index if not exists external_api_usage_recent_idx
  on external_api_usage (occurred_at desc);

alter table external_api_usage enable row level security;

-- Users see only their own usage rows.
create policy "users read own usage"
  on external_api_usage
  for select
  using (auth.uid() = user_id);

-- Writes happen via the service role (server-side only — never from the
-- browser). No insert/update/delete policy for end-users.
