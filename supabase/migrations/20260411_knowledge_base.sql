-- RAG knowledge base for the audit system.
-- Stores chunked text from the OpsRadar research library + OpenAI embeddings
-- (text-embedding-3-small -> 1536 dims).

create extension if not exists vector;

create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  source_file text not null,
  content text not null,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- IVFFlat index for cosine similarity. lists=100 is a reasonable default for
-- libraries up to ~100k rows. Rebuild with a larger `lists` value if the
-- corpus grows well beyond that.
create index if not exists knowledge_base_embedding_idx
  on public.knowledge_base
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists knowledge_base_source_file_idx
  on public.knowledge_base (source_file);

alter table public.knowledge_base enable row level security;
-- No anon policies granted — only the service role (server-side) can read or
-- write this table. Retrieval happens in the audit route via the service key.

-- Similarity search RPC. Returns the top `match_count` chunks whose embedding
-- is closest to `query_embedding` by cosine distance, optionally filtered by
-- a minimum similarity threshold.
create or replace function public.match_knowledge_base(
  query_embedding vector(1536),
  match_count int default 5,
  match_threshold float default 0.0
)
returns table (
  id uuid,
  source_file text,
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
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) as similarity
  from public.knowledge_base kb
  where kb.embedding is not null
    and 1 - (kb.embedding <=> query_embedding) >= match_threshold
  order by kb.embedding <=> query_embedding
  limit match_count;
$$;
