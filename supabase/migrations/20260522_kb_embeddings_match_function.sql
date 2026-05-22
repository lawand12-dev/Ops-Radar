-- RPC: cosine-similarity nearest-neighbour search over kb_embeddings.
-- Called by semanticSearchKb() in src/lib/coo/semantic-retrieval.ts.
--
-- Returns the top-N matches sorted by similarity desc.
-- similarity = 1 - cosine_distance, so 1.0 = identical, 0 = orthogonal.

CREATE OR REPLACE FUNCTION match_kb_embeddings(
  query_embedding VECTOR(1536),
  match_count     INT DEFAULT 5
)
RETURNS TABLE (
  source_file     TEXT,
  category        TEXT,
  title           TEXT,
  summary         TEXT,
  content_preview TEXT,
  similarity      FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    source_file,
    category,
    title,
    summary,
    content_preview,
    1 - (embedding <=> query_embedding) AS similarity
  FROM kb_embeddings
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
