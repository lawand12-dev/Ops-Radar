-- supabase/migrations/20260430_knowledge_base_v2.sql
-- Extends knowledge_base with slug, category, links, updated_at
-- and enhances match_knowledge_base with an optional category filter.

alter table public.knowledge_base
  add column if not exists slug text,
  add column if not exists category text,
  add column if not exists links text[] default '{}',
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists knowledge_base_slug_idx
  on public.knowledge_base (slug)
  where slug is not null;

create index if not exists knowledge_base_category_idx
  on public.knowledge_base (category);

-- Replace the RPC to add optional category filter.
create or replace function public.match_knowledge_base(
  query_embedding vector(1536),
  match_count int default 5,
  match_threshold float default 0.0,
  filter_category text default null
)
returns table (
  id uuid,
  source_file text,
  slug text,
  category text,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  select
    kb.id,
    kb.source_file,
    kb.slug,
    kb.category,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) as similarity
  from public.knowledge_base kb
  where kb.embedding is not null
    and 1 - (kb.embedding <=> query_embedding) >= match_threshold
    and (filter_category is null or kb.category = filter_category)
  order by kb.embedding <=> query_embedding
  limit match_count;
$$;
