-- CP-27: Git-like versioned brain storage (Postgres-as-substrate).
--
-- "OpsRadar-hosted git repo per customer" implemented as three Postgres
-- tables. Same semantics as git (markdown files + version history +
-- atomic multi-file commits), without the operational burden of real git
-- (GitHub rate limits would ban us at ~200 customers; self-hosted git
-- adds a stateful service to operate; our customers can't `git clone`
-- anyway because they're non-technical agency owners).
--
-- 3-table refined schema per the research validation
-- (docs/strategy/three-tier-memory-architecture-2026.md):
--   1. brain_commits           — one row per atomic multi-file commit
--   2. brain_document_versions — append-only history of all changes
--   3. brain_documents         — pointer to the current version per path
--
-- Multi-file atomic commit is one Postgres transaction:
--   begin;
--     insert into brain_commits      (returning id) ──┐
--     insert into brain_document_versions x N (uses ┘ commit_id)
--     update brain_documents set current_version_id = ... x N
--   commit;
--
-- Reads: select * from brain_documents join brain_document_versions
--   on current_version_id. Bounded sub-ms with the right indexes.
--
-- Migration to real git later (via isomorphic-git on R2) is a one-way
-- door: this schema is the export source, not a lock-in.

-- ─── 1. brain_commits — atomic multi-file commit groups ────────────────────

create table if not exists brain_commits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  message         text,
  author_type     text not null,                       -- 'agent:revenue', 'agent:coo', 'coo-chat', 'customer', 'sync'
  agent_run_id    uuid,                                -- optional FK to agent_runs.id
  created_at      timestamptz not null default now()
);

create index if not exists brain_commits_user_time_idx
  on brain_commits (user_id, created_at desc);

create index if not exists brain_commits_user_author_idx
  on brain_commits (user_id, author_type, created_at desc);

alter table brain_commits enable row level security;

create policy "users read own commits"
  on brain_commits
  for select
  using (auth.uid() = user_id);

-- ─── 2. brain_document_versions — append-only history ────────────────────

create table if not exists brain_document_versions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  document_id     uuid not null,                       -- FK added after brain_documents exists
  commit_id       uuid not null references brain_commits(id) on delete cascade,
  path            text not null,                       -- denormalized for fast direct lookups
  content         text not null,                       -- the full markdown body
  content_hash    text not null,                       -- sha-256 for change detection
  content_size    int not null,
  created_at      timestamptz not null default now()
);

-- "Show me version history for a specific path"
create index if not exists brain_document_versions_user_path_time_idx
  on brain_document_versions (user_id, path, created_at desc);

-- "Show me all versions in this commit" (for diff/audit views)
create index if not exists brain_document_versions_commit_idx
  on brain_document_versions (commit_id);

-- "Show me all the latest content for this user" (fast read path)
create index if not exists brain_document_versions_user_doc_idx
  on brain_document_versions (user_id, document_id, created_at desc);

alter table brain_document_versions enable row level security;

create policy "users read own document versions"
  on brain_document_versions
  for select
  using (auth.uid() = user_id);

-- ─── 3. brain_documents — current pointer per path ───────────────────────

create table if not exists brain_documents (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  path                 text not null,                       -- 'clients/acme-corp.md'
  current_version_id   uuid references brain_document_versions(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique(user_id, path)
);

-- Fast "give me all documents for this user" — primary read path for export
create index if not exists brain_documents_user_path_idx
  on brain_documents (user_id, path);

alter table brain_documents enable row level security;

create policy "users read own documents"
  on brain_documents
  for select
  using (auth.uid() = user_id);

-- ─── Late FK: brain_document_versions.document_id → brain_documents.id ───
--
-- Added here so the version row references a stable document identity
-- even after the pointer rotates.

alter table brain_document_versions
  add constraint brain_document_versions_document_fk
  foreign key (document_id) references brain_documents(id) on delete cascade;
