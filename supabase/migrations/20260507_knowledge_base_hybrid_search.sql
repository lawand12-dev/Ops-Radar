-- supabase/migrations/20260507_knowledge_base_hybrid_search.sql
-- Adds keyword+semantic hybrid retrieval for the OpsRadar knowledge base.
-- The app falls back to match_knowledge_base until this migration is applied.

alter table public.knowledge_base
  add column if not exists content_search tsvector
  generated always as (
    to_tsvector(
      'english',
      coalesce(source_file, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(slug, '') || ' ' ||
      coalesce(content, '')
    )
  ) stored;

create index if not exists knowledge_base_content_search_idx
  on public.knowledge_base
  using gin (content_search);

-- Keep the existing ivfflat index in place for compatibility. HNSW is more
-- robust as the corpus changes because it does not require list-count tuning.
create index if not exists knowledge_base_embedding_hnsw_idx
  on public.knowledge_base
  using hnsw (embedding vector_cosine_ops);

create or replace function public.match_knowledge_base_hybrid(
  query_embedding vector(1536),
  query_text text,
  match_count int default 5,
  match_threshold float default 0.0,
  filter_category text default null,
  vector_weight float default 0.70,
  text_weight float default 0.30,
  candidate_count int default 50
)
returns table (
  id uuid,
  source_file text,
  slug text,
  category text,
  content text,
  metadata jsonb,
  similarity float,
  vector_similarity float,
  text_rank float,
  combined_score float
)
language sql
stable
as $$
  with query as (
    select websearch_to_tsquery('english', coalesce(query_text, '')) as tsq
  ),
  vector_matches as (
    select
      kb.id,
      kb.source_file,
      kb.slug,
      kb.category,
      kb.content,
      kb.metadata,
      1 - (kb.embedding <=> query_embedding) as vector_similarity,
      0.0::float as text_rank
    from public.knowledge_base kb
    where kb.embedding is not null
      and (filter_category is null or kb.category = filter_category)
    order by kb.embedding <=> query_embedding
    limit greatest(candidate_count, match_count)
  ),
  text_matches as (
    select
      kb.id,
      kb.source_file,
      kb.slug,
      kb.category,
      kb.content,
      kb.metadata,
      0.0::float as vector_similarity,
      ts_rank_cd(kb.content_search, query.tsq)::float as text_rank
    from public.knowledge_base kb, query
    where length(coalesce(query_text, '')) > 0
      and query.tsq @@ kb.content_search
      and (filter_category is null or kb.category = filter_category)
    order by ts_rank_cd(kb.content_search, query.tsq) desc
    limit greatest(candidate_count, match_count)
  ),
  combined as (
    select * from vector_matches
    union all
    select * from text_matches
  ),
  ranked as (
    select
      combined.id,
      combined.source_file,
      combined.slug,
      combined.category,
      combined.content,
      combined.metadata,
      max(combined.vector_similarity) as vector_similarity,
      max(combined.text_rank) as text_rank
    from combined
    group by
      combined.id,
      combined.source_file,
      combined.slug,
      combined.category,
      combined.content,
      combined.metadata
  )
  select
    ranked.id,
    ranked.source_file,
    ranked.slug,
    ranked.category,
    ranked.content,
    ranked.metadata,
    ranked.vector_similarity as similarity,
    ranked.vector_similarity,
    ranked.text_rank,
    (ranked.vector_similarity * vector_weight)
      + (least(ranked.text_rank, 1.0) * text_weight) as combined_score
  from ranked
  where ranked.vector_similarity >= match_threshold
    or ranked.text_rank > 0
  order by combined_score desc, ranked.vector_similarity desc
  limit match_count;
$$;

analyze public.knowledge_base;
