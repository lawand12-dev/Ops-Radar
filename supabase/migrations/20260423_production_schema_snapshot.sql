-- ═══════════════════════════════════════════════════════════════════════════
-- OpsRadar — Production Schema Snapshot
-- Generated: 2026-04-23 from live project nbdcrmepvwbfbcjqfubr
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- This file is the authoritative record of the production database schema
-- as of 2026-04-23. It replaces piecemeal knowledge that previously lived
-- only in `src/lib/supabase.ts` comments.
--
-- USAGE
-- DO NOT apply this to the existing production database — it is already in
-- this state. This file exists for:
--   1. Source-of-truth documentation (read the repo to know the schema)
--   2. Disaster recovery (new Supabase project → run this file → schema rebuilt)
--   3. Local dev (spin up a fresh Supabase → apply this → develop against it)
--
-- All statements are IF NOT EXISTS / OR REPLACE so re-running is a no-op.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. Extensions ─────────────────────────────────────────────────────────
-- pgcrypto: gen_random_uuid() used in every table default.
-- vector:   pgvector, used by knowledge_base.embedding for RAG.
-- Supabase auto-installs plpgsql, pg_graphql, pg_stat_statements, supabase_vault.

create extension if not exists pgcrypto;
create extension if not exists vector;


-- ─── 2. Trigger functions (must exist before tables that use them) ─────────

create or replace function public.crm_prospects_set_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  -- Also bump stage_changed_at whenever stage changes, so pipeline analytics
  -- can measure time-in-stage accurately.
  if new.stage is distinct from old.stage then
    new.stage_changed_at = now();
  end if;
  return new;
end;
$function$;


-- ─── 3. Tables (dependency-ordered: parents before children) ───────────────

-- audits: the top of the funnel. Stores every completed audit. Referenced by
-- audit_events, build_requests, crm_prospects.
create table if not exists public.audits (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  email              text not null,
  company            text not null,
  answers            jsonb not null,
  result             jsonb not null,
  access_token       text,
  unsubscribe_token  text,
  unsubscribed_at    timestamptz,
  follow_up_1_sent   boolean default false,
  follow_up_2_sent   boolean default false,
  follow_up_3_sent   boolean default false,
  created_at         timestamptz default now()
);

-- audit_sessions: funnel-step tracker for visitors who start but don't finish.
-- session_id is the client-side uuid from localStorage.
create table if not exists public.audit_sessions (
  id            uuid primary key default gen_random_uuid(),
  session_id    text not null unique,
  step_reached  integer not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- audit_events: every funnel event (step_started, step_completed, etc.)
-- session_id is the CLIENT session id string, not an FK to audit_sessions.id.
create table if not exists public.audit_events (
  id            uuid primary key default gen_random_uuid(),
  session_id    text,
  audit_id      uuid references public.audits(id) on delete set null,
  event_name    text not null,
  step          integer,
  source        text,
  section_id    text,
  report_stage  text,
  metadata      jsonb,
  created_at    timestamptz default now()
);

-- build_requests: when a prospect clicks "build this for me" on the results page.
create table if not exists public.build_requests (
  id                uuid primary key default gen_random_uuid(),
  audit_id          uuid references public.audits(id) on delete set null,
  automation_title  text not null,
  name              text not null,
  email             text not null,
  budget            text not null,
  timeline          text not null,
  notes             text,
  created_at        timestamptz default now()
);

-- chat_conversations: AI chat widget sessions. One row per visitor, messages
-- appended into the jsonb array.
create table if not exists public.chat_conversations (
  id             uuid primary key default gen_random_uuid(),
  visitor_id     text not null,
  messages       jsonb not null default '[]'::jsonb,
  visitor_email  text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- quick_win_onboarding_requests: quick-win landing-page email opt-ins.
create table if not exists public.quick_win_onboarding_requests (
  id            uuid primary key default gen_random_uuid(),
  primary_tool  text not null,
  goal          text not null,
  email         text not null,
  source        text,
  created_at    timestamptz default now()
);

-- knowledge_base: RAG corpus for audit generation.
-- text-embedding-3-small → 1536 dims.
create table if not exists public.knowledge_base (
  id           uuid primary key default gen_random_uuid(),
  source_file  text not null,
  content      text not null,
  embedding    vector(1536),
  metadata     jsonb,
  created_at   timestamptz default now()
);

-- research_cache: 7-day cache of website research results, keyed by URL.
create table if not exists public.research_cache (
  url            text primary key,
  research_data  jsonb not null,
  fetched_at     timestamptz not null default now(),
  expires_at     timestamptz not null
);

-- crm_prospects: every person we've talked to or are pursuing. Parent of
-- crm_interactions. Check constraints enforce a known-good vocabulary.
create table if not exists public.crm_prospects (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  display_name          text not null,
  handle                text,
  full_name             text,
  email                 text,
  company_name          text,
  company_url           text,
  segment               text check (segment in ('paid-media','seo','full-service','other','unknown')),
  team_size             text,
  location              text,
  first_source          text not null check (first_source in ('reddit','x','instagram','linkedin','inbound-audit','inbound-call','referral','other')),
  first_source_detail   text,
  stage                 text not null default 'new' check (stage in ('new','engaged','qualified','audit-completed','call-booked','proposal-sent','won','lost','nurture')),
  stage_changed_at      timestamptz not null default now(),
  estimated_deal_value  integer,
  predicted_close_date  date,
  actual_close_date     date,
  actual_deal_value     integer,
  primary_pain          text,
  tool_stack            text[],
  objections            text[],
  notes                 text,
  tags                  text[],
  next_action           text,
  next_action_date      date,
  audit_id              uuid,  -- references audits(id), not enforced as FK since audits may be cleared
  archived              boolean not null default false
);

comment on table public.crm_prospects is
  'People you have talked to or are actively pursuing. One row per person, regardless of channel.';

-- crm_interactions: every touchpoint with a prospect (append-only).
create table if not exists public.crm_interactions (
  id            uuid primary key default gen_random_uuid(),
  prospect_id   uuid not null references public.crm_prospects(id) on delete cascade,
  created_at    timestamptz not null default now(),
  occurred_at   timestamptz not null default now(),
  channel       text not null check (channel in ('reddit','x','instagram','linkedin','email','call','whatsapp','dm-audit','note','other')),
  direction     text not null check (direction in ('inbound','outbound','internal-note')),
  summary       text not null,
  full_content  text,
  my_response   text,
  response_at   timestamptz,
  sentiment     text check (sentiment in ('positive','neutral','skeptical','negative','unclear')),
  signals       text[]
);

comment on table public.crm_interactions is
  'Every touchpoint with a prospect — DMs, comments, emails, calls. Appended, never overwritten.';


-- ─── 4. Views ──────────────────────────────────────────────────────────────

-- crm_pipeline_snapshot: counts + deal value per stage, oldest-first ordering
-- so you can eyeball stuck prospects.
create or replace view public.crm_pipeline_snapshot as
select
  stage,
  count(*) as prospect_count,
  sum(coalesce(estimated_deal_value, 0)) as total_estimated_value,
  min(stage_changed_at) as oldest_in_stage,
  max(stage_changed_at) as newest_in_stage
from public.crm_prospects
where archived = false
group by stage
order by
  case stage
    when 'new'              then 1
    when 'engaged'          then 2
    when 'qualified'        then 3
    when 'audit-completed'  then 4
    when 'call-booked'      then 5
    when 'proposal-sent'    then 6
    when 'won'              then 7
    when 'nurture'          then 8
    when 'lost'             then 9
  end;

-- crm_follow_ups_due: prospects whose next_action_date is past due.
create or replace view public.crm_follow_ups_due as
select
  id,
  display_name,
  company_name,
  segment,
  stage,
  next_action,
  next_action_date,
  primary_pain,
  first_source,
  (current_date - next_action_date) as days_overdue
from public.crm_prospects
where archived = false
  and next_action_date is not null
  and next_action_date <= current_date
  and stage not in ('won','lost')
order by next_action_date;


-- ─── 5. Indexes ────────────────────────────────────────────────────────────

-- audits: token lookups on results page and unsubscribe page.
create index if not exists idx_audits_access_token        on public.audits (access_token);
create index if not exists idx_audits_unsubscribe_token   on public.audits (unsubscribe_token);

-- audit_events: funnel queries and per-audit history.
create index if not exists audit_events_session_idx  on public.audit_events (session_id);
create index if not exists audit_events_audit_idx    on public.audit_events (audit_id);
create index if not exists audit_events_name_idx     on public.audit_events (event_name);

-- knowledge_base: ivfflat for vector similarity, btree for source-file lookup.
-- lists=100 is fine up to ~100k rows. Rebuild with higher lists if corpus grows.
create index if not exists knowledge_base_embedding_idx
  on public.knowledge_base
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists knowledge_base_source_file_idx
  on public.knowledge_base (source_file);

-- research_cache: the cron job prunes rows by expires_at.
create index if not exists research_cache_expires_at_idx
  on public.research_cache (expires_at);

-- CRM: supports the views, partial indexes exclude archived prospects.
create index if not exists idx_crm_prospects_stage
  on public.crm_prospects (stage)
  where archived = false;

create index if not exists idx_crm_prospects_next_action_date
  on public.crm_prospects (next_action_date)
  where archived = false and next_action_date is not null;

create index if not exists idx_crm_prospects_segment       on public.crm_prospects (segment);
create index if not exists idx_crm_prospects_first_source  on public.crm_prospects (first_source);
create index if not exists idx_crm_prospects_updated_at    on public.crm_prospects (updated_at desc);

create index if not exists idx_crm_interactions_prospect_id  on public.crm_interactions (prospect_id);
create index if not exists idx_crm_interactions_occurred_at  on public.crm_interactions (occurred_at desc);
create index if not exists idx_crm_interactions_channel      on public.crm_interactions (channel);


-- ─── 6. Triggers ───────────────────────────────────────────────────────────

drop trigger if exists trg_crm_prospects_updated_at on public.crm_prospects;
create trigger trg_crm_prospects_updated_at
  before update on public.crm_prospects
  for each row
  execute function public.crm_prospects_set_updated_at();


-- ─── 7. RPCs (remote procedure calls exposed to PostgREST) ─────────────────

-- match_knowledge_base: vector similarity search against the RAG corpus.
-- Called from the backend during audit generation and chat RAG.
create or replace function public.match_knowledge_base(
  query_embedding vector(1536),
  match_count int default 5,
  match_threshold float default 0.0
)
returns table (
  id          uuid,
  source_file text,
  content     text,
  metadata    jsonb,
  similarity  float
)
language sql
stable
as $function$
  select
    kb.id,
    kb.source_file,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) as similarity
  from public.knowledge_base kb
  where kb.embedding is not null
    and 1 - (kb.embedding <=> query_embedding) >= match_threshold
  order by kb.embedding <=> query_embedding
  limit match_count;
$function$;


-- ─── 8. Row-Level Security + policies ──────────────────────────────────────
-- Principle: service_role (backend API) bypasses RLS by design. The anon role
-- (frontend supabase.ts client) must never reach any of these tables directly.
-- Every table here is backend-only territory.

alter table public.audits                          enable row level security;
alter table public.audit_sessions                  enable row level security;
alter table public.audit_events                    enable row level security;
alter table public.build_requests                  enable row level security;
alter table public.chat_conversations              enable row level security;
alter table public.quick_win_onboarding_requests   enable row level security;
alter table public.knowledge_base                  enable row level security;
alter table public.research_cache                  enable row level security;
alter table public.crm_prospects                   enable row level security;
alter table public.crm_interactions                enable row level security;

-- Explicit deny policies on every table. Belt-and-suspenders on top of RLS
-- default-deny. If a future migration ever accidentally GRANTs anon access or
-- creates a permissive policy, this `using (false)` still blocks reads.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'audits','audit_sessions','audit_events','build_requests','chat_conversations',
    'quick_win_onboarding_requests','knowledge_base','research_cache',
    'crm_prospects','crm_interactions'
  ]
  loop
    execute format(
      'drop policy if exists "block_all_anon" on public.%I;', tbl
    );
    execute format(
      'create policy "block_all_anon" on public.%I as permissive for all to anon using (false) with check (false);',
      tbl
    );
  end loop;
end $$;


-- ─── 9. Grants ─────────────────────────────────────────────────────────────
-- No GRANTs to anon / public. service_role inherits its Supabase-level
-- privileges; we don't re-grant here because the service_role is a
-- cluster-level Supabase construct, not a per-database role we manage.

-- Lock down default privileges so future CREATE TABLE statements in `public`
-- don't silently re-grant anything to anon. This is the root-cause fix for
-- the drift that caused the original Supabase security advisor alert.
alter default privileges in schema public revoke all on tables from anon, public;
alter default privileges in schema public revoke all on sequences from anon, public;
alter default privileges in schema public revoke all on functions from anon, public;


-- ═══════════════════════════════════════════════════════════════════════════
-- End of schema snapshot.
-- Next migration should be dated after 20260423 and contain ONLY the delta.
-- ═══════════════════════════════════════════════════════════════════════════
