-- Research cache table for website-research-agent
-- Stores AgencyResearch blobs keyed by URL with a 7-day TTL.

create table if not exists public.research_cache (
  url text primary key,
  research_data jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists research_cache_expires_at_idx
  on public.research_cache (expires_at);

alter table public.research_cache enable row level security;

-- Only the service role (server-side) reads/writes this table.
-- No anon policies are granted, so the anon key cannot touch it.
