// src/lib/coo/brain-search.ts
//
// Per-tenant semantic search over the diorized brain — breadcrumbs +
// pattern cards. This is the COO agent's Tier-3 retrieval (the
// per-user outcome/diorization memory) — distinct from search_kb
// which is the Tier-1 static knowledge base.
//
// Without this, the COO agent can quote industry benchmarks but can't
// reference the user's OWN agency history. With it, the agent answers
// "what patterns have you seen about Client X?" by reading the actual
// breadcrumbs + pattern cards from this user's brain.

import OpenAI from 'openai';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

const EMBED_MODEL = 'text-embedding-3-small';

export type BrainMatch =
  | { kind: 'breadcrumb'; id: string; occurred_at: string; summary: string; tags: string[] | null; source_type: string; similarity: number }
  | { kind: 'pattern_card'; id: string; title: string; description: string; pattern_type: string; confidence: number; first_observed_at: string; source_count: number };

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
 * Returns the top-N most relevant brain entries for the query, scoped
 * to userId. Combines semantic breadcrumb matches with all active
 * pattern cards (since there are usually <50 patterns per tenant, we
 * include them all and let the LLM filter).
 *
 * Gracefully degrades to keyword-only on embed failure.
 */
export async function searchBrain(
  userId: string,
  query: string,
  limit: number = 10,
): Promise<BrainMatch[]> {
  if (!query.trim()) return [];

  const supabase = getServerSupabaseClient();

  // 1. All active pattern cards (small set; relevant context for the agent)
  const { data: patterns } = await supabase
    .from('pattern_cards')
    .select('id, title, description, pattern_type, confidence, first_observed_at, source_breadcrumb_ids')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('confidence', { ascending: false })
    .limit(20);

  const patternMatches: BrainMatch[] = (patterns ?? []).map((p) => ({
    kind: 'pattern_card' as const,
    id: p.id,
    title: p.title,
    description: p.description,
    pattern_type: p.pattern_type,
    confidence: Number(p.confidence),
    first_observed_at: p.first_observed_at,
    source_count: (p.source_breadcrumb_ids as string[] | null)?.length ?? 0,
  }));

  // 2. Semantic match against breadcrumbs (per-user). Falls back to
  // recency-ordered breadcrumbs if embedding fails.
  let breadcrumbMatches: BrainMatch[] = [];
  try {
    const r = await openai().embeddings.create({
      model: EMBED_MODEL,
      input: query.slice(0, 8000),
    });
    const queryEmbedding = r.data[0]?.embedding ?? [];

    if (queryEmbedding.length === 1536) {
      const rpc = supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{
        data: Array<{ id: string; occurred_at: string; summary: string; tags: string[] | null; source_type: string; similarity: number }> | null;
        error: unknown;
      }>;
      const { data, error } = await rpc('match_breadcrumbs_for_user', {
        target_user_id: userId,
        query_embedding: queryEmbedding as unknown as string,
        match_count: limit,
      });
      if (!error && data) {
        breadcrumbMatches = data
          .filter((m) => m.similarity >= 0.25)
          .map((m) => ({
            kind: 'breadcrumb' as const,
            id: m.id,
            occurred_at: m.occurred_at,
            summary: m.summary,
            tags: m.tags,
            source_type: m.source_type,
            similarity: m.similarity,
          }));
      }
    }
  } catch {
    // fall through to recency fallback
  }

  // Recency fallback if semantic produced nothing
  if (breadcrumbMatches.length === 0) {
    const { data } = await supabase
      .from('breadcrumbs')
      .select('id, occurred_at, summary, tags, source_type')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false })
      .limit(limit);
    breadcrumbMatches = (data ?? []).map((b) => ({
      kind: 'breadcrumb' as const,
      id: b.id,
      occurred_at: b.occurred_at,
      summary: b.summary,
      tags: b.tags,
      source_type: b.source_type,
      similarity: 0,
    }));
  }

  return [...patternMatches, ...breadcrumbMatches];
}

export function formatBrainContext(matches: BrainMatch[]): string {
  if (matches.length === 0) return 'No relevant memory found in the brain.';

  const patterns = matches.filter((m): m is Extract<BrainMatch, { kind: 'pattern_card' }> => m.kind === 'pattern_card');
  const breadcrumbs = matches.filter((m): m is Extract<BrainMatch, { kind: 'breadcrumb' }> => m.kind === 'breadcrumb');

  const out: string[] = [];
  if (patterns.length) {
    out.push('## Detected patterns');
    for (const p of patterns) {
      out.push(`- [${p.pattern_type}] ${p.title} (confidence ${(p.confidence * 100).toFixed(0)}%, ${p.source_count} sources, first observed ${p.first_observed_at.slice(0, 10)})\n  ${p.description}`);
    }
  }
  if (breadcrumbs.length) {
    out.push('\n## Relevant conversations');
    for (const b of breadcrumbs) {
      const tags = (b.tags ?? []).slice(0, 5).join(', ');
      out.push(`- [${b.source_type} ${b.occurred_at.slice(0, 10)}]${tags ? ` (${tags})` : ''} ${b.summary}`);
    }
  }
  return out.join('\n');
}
