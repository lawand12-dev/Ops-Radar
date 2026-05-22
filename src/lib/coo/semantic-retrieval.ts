// src/lib/coo/semantic-retrieval.ts
//
// Semantic retrieval over the KB embeddings table. Used by the hybrid
// retriever in src/lib/knowledge-retrieval.ts to AUGMENT the existing
// keyword/category routing (not replace it — hybrid wins).
//
// Embedding model: OpenAI text-embedding-3-small (1536d). Must match
// what scripts/embed-kb.ts produced.

import OpenAI from 'openai';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

const EMBED_MODEL = 'text-embedding-3-small';

export type SemanticMatch = {
  source_file: string;
  category: string | null;
  title: string | null;
  summary: string | null;
  content_preview: string | null;
  similarity: number; // 1 = identical, 0 = orthogonal, -1 = opposite
};

let _openai: OpenAI | null = null;
function openai(): OpenAI {
  if (!_openai) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY missing');
    _openai = new OpenAI({ apiKey: key });
  }
  return _openai;
}

/**
 * Returns the top-N KB chunks most semantically similar to the query.
 * Empty array on any failure (network, no embeddings, no OPENAI_API_KEY)
 * so the calling retriever falls back to keyword routing without breaking.
 */
export async function semanticSearchKb(
  query: string,
  limit: number = 5,
): Promise<SemanticMatch[]> {
  if (!query.trim()) return [];

  let queryEmbedding: number[];
  try {
    const r = await openai().embeddings.create({
      model: EMBED_MODEL,
      input: query.slice(0, 8000),
    });
    queryEmbedding = r.data[0]?.embedding ?? [];
    if (queryEmbedding.length !== 1536) return [];
  } catch {
    return [];
  }

  try {
    const supabase = getServerSupabaseClient();
    // The match_kb_embeddings RPC is defined in
    // supabase/migrations/20260522_kb_embeddings_match_function.sql
    // but the type generator doesn't pick up custom functions yet — cast
    // through the generic rpc<> overload so TS doesn't try to enumerate
    // known function names.
    const rpc = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: SemanticMatch[] | null; error: unknown }>;
    const { data, error } = await rpc('match_kb_embeddings', {
      query_embedding: queryEmbedding as unknown as string,
      match_count: limit,
    });
    if (error || !data) return [];
    return data.filter((m: SemanticMatch) => m.similarity >= 0.30);
  } catch {
    return [];
  }
}
