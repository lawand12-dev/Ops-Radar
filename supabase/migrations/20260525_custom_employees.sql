-- CP-34 — Custom AI Employees (named teammates customer creates via COO chat).
--
-- Architecture (Option C, hierarchical):
--   AI COO  ──supervisor──>  N employees (built-in + custom)
--     │                          │
--     │      consult_coo()       │
--     └─────  escalation  ───────┘
--
-- The 28 built-in agents stay in code (`src/lib/agents/registry.ts`). Custom
-- employees live here, in this table, scoped per user. The dispatcher iterates
-- BOTH on every cron tick — same `runAgent(spec, userId)` code path.
--
-- Memory: employees write to the existing `brain_documents` table (CP-27) with
-- author_type = 'employee:<slug>'. Private working notes go under the brain
-- prefix `employees/<slug>/`. No new memory table needed.
--
-- Chat: each employee has its own thread (`custom_employee_chat_threads`).
-- Messages are stored separately so we can paginate / archive cheaply.

-- =============================================================================
-- Table 1: custom_employees — the AI workforce roster
-- =============================================================================
create table if not exists public.custom_employees (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,

  -- Identity (what makes them a named teammate)
  slug                    text not null,                    -- 'sarah', 'marcus-pm'
  name                    text not null,                    -- 'Sarah'
  role                    text not null,                    -- 'Bookkeeper'
  emoji                   text default '👤',                 -- avatar fallback
  avatar_url              text,                              -- optional uploaded
  persona_summary         text,                              -- 1-paragraph "who they are"
  system_prompt           text not null,                     -- the actual prompt

  -- Scheduling
  schedule_cron           text,                              -- '0 8 * * *' or null (chat-only)
  status                  text not null default 'active'
                          check (status in ('active','paused','archived')),

  -- Control
  autonomy                text not null default 'ask'
                          check (autonomy in ('ask','auto','off')),
  model_slug              text default 'gpt-5.4',
  max_steps               int default 25 check (max_steps between 1 and 100),

  -- Scoping (security + predictability)
  scoped_toolkits         text[] not null default '{}',      -- ['stripe','notion']
  scoped_brain_prefixes   text[] not null default '{}',      -- ['employees/sarah/','real-pl/']

  -- CP-37 org chart hierarchy (parent_id for delegation)
  parent_employee_id      uuid references public.custom_employees(id) on delete set null,

  -- Bookkeeping
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  last_run_at             timestamptz,

  -- One slug per user (no two employees with the same name)
  unique(user_id, slug)
);

create index if not exists idx_custom_employees_user_status
  on public.custom_employees(user_id, status);

create index if not exists idx_custom_employees_schedule
  on public.custom_employees(schedule_cron)
  where status = 'active' and schedule_cron is not null;

create index if not exists idx_custom_employees_parent
  on public.custom_employees(parent_employee_id)
  where parent_employee_id is not null;

alter table public.custom_employees enable row level security;

create policy custom_employees_owner_select on public.custom_employees
  for select to authenticated using (auth.uid() = user_id);
create policy custom_employees_owner_insert on public.custom_employees
  for insert to authenticated with check (auth.uid() = user_id);
create policy custom_employees_owner_update on public.custom_employees
  for update to authenticated using (auth.uid() = user_id);
create policy custom_employees_owner_delete on public.custom_employees
  for delete to authenticated using (auth.uid() = user_id);


-- =============================================================================
-- Table 2: custom_employee_chat_threads — one thread per employee per customer
-- =============================================================================
--
-- Built-in employees get threads too (rows are auto-created on first chat —
-- `employee_slug` is stored, `employee_id` is null when the employee is built-in).
create table if not exists public.custom_employee_chat_threads (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,

  -- Polymorphic employee reference:
  --   Custom employee: employee_id set, employee_slug mirrors custom_employees.slug
  --   Built-in employee: employee_id null, employee_slug is the registry slug
  employee_id         uuid references public.custom_employees(id) on delete cascade,
  employee_slug       text not null,                         -- 'sarah' or 'revenue'

  title               text,                                  -- auto-generated from 1st user msg
  created_at          timestamptz not null default now(),
  last_message_at     timestamptz not null default now(),

  -- We allow many threads per employee per user (like ChatGPT chat history)
  -- but list views default to the most-recent one.
  unique(user_id, employee_slug, id)
);

create index if not exists idx_employee_threads_user_employee
  on public.custom_employee_chat_threads(user_id, employee_slug, last_message_at desc);

alter table public.custom_employee_chat_threads enable row level security;

create policy employee_threads_owner_select on public.custom_employee_chat_threads
  for select to authenticated using (auth.uid() = user_id);
create policy employee_threads_owner_insert on public.custom_employee_chat_threads
  for insert to authenticated with check (auth.uid() = user_id);
create policy employee_threads_owner_update on public.custom_employee_chat_threads
  for update to authenticated using (auth.uid() = user_id);
create policy employee_threads_owner_delete on public.custom_employee_chat_threads
  for delete to authenticated using (auth.uid() = user_id);


-- =============================================================================
-- Table 3: custom_employee_messages — chat history per thread
-- =============================================================================
create table if not exists public.custom_employee_messages (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null references public.custom_employee_chat_threads(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('user','employee','system','tool')),
  content         text not null default '',
  tool_calls      jsonb,
  tool_results    jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_employee_messages_thread
  on public.custom_employee_messages(thread_id, created_at);

alter table public.custom_employee_messages enable row level security;

create policy employee_messages_owner_select on public.custom_employee_messages
  for select to authenticated using (auth.uid() = user_id);
create policy employee_messages_owner_insert on public.custom_employee_messages
  for insert to authenticated with check (auth.uid() = user_id);
create policy employee_messages_owner_delete on public.custom_employee_messages
  for delete to authenticated using (auth.uid() = user_id);


-- =============================================================================
-- updated_at trigger for custom_employees
-- =============================================================================
create or replace function public.touch_custom_employees_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_custom_employees on public.custom_employees;
create trigger trg_touch_custom_employees
  before update on public.custom_employees
  for each row execute function public.touch_custom_employees_updated_at();
