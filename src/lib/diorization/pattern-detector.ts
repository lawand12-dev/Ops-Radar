// src/lib/diorization/pattern-detector.ts
//
// Detects recurring patterns across a tenant's breadcrumbs and writes
// pattern_cards. Runs monthly per tenant (or on-demand for high-velocity
// tenants).
//
// Strategy:
//   1. Pull last 90 days of breadcrumbs for the user
//   2. Cluster by tag overlap (cheap, deterministic)
//   3. For each cluster of >= 3 breadcrumbs, ask the LLM to name the
//      pattern + assign a confidence score
//   4. Upsert pattern_cards; mark stale ones (no breadcrumb in last
//      45 days) as is_active=false

import { openai } from '<npm>/lib/openai';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import type { PatternCardInput } from './types';

const PATTERN_MODEL = 'gpt-4o-mini';
const PATTERN_SYSTEM_PROMPT = `You are a pattern detector. You will receive a CLUSTER of 3+ conversation breadcrumbs that share tags. Your job is to identify the recurring pattern, IF ANY, that links them.

A real pattern:
- Has a specific operational meaning ("Client X expands scope every Q4")
- Is repeated across the cluster (not just one event)
- Is actionable (the owner could do something about it)

A non-pattern: random topical overlap, single-event noise, or generic agency activity.

Return JSON only:
{
  "is_pattern": true|false,
  "pattern_type": "kebab-case-pattern-id",
  "title": "Client X has a Q4 scope-expansion pattern",
  "description": "Across 4 conversations in Sept-Nov, ...",
  "confidence": 0.0..1.0
}

If is_pattern=false, return {"is_pattern": false} only.`;

type Breadcrumb = {
  id: string;
  user_id: string;
  occurred_at: string;
  summary: string;
  tags: string[];
};

function clusterByTagOverlap(breadcrumbs: Breadcrumb[], minClusterSize = 3): Breadcrumb[][] {
  const clusters: Map<string, Breadcrumb[]> = new Map();
  for (const b of breadcrumbs) {
    for (const tag of b.tags ?? []) {
      const existing = clusters.get(tag) ?? [];
      existing.push(b);
      clusters.set(tag, existing);
    }
  }
  return Array.from(clusters.values()).filter((c) => c.length >= minClusterSize);
}

export async function detectPatternsForUser(userId: string): Promise<{
  cards_added: number;
  cards_marked_stale: number;
}> {
  const supabase = getServerSupabaseClient();

  // Pull last 90 days of breadcrumbs
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: breadcrumbs } = await supabase
    .from('breadcrumbs')
    .select('id, user_id, occurred_at, summary, tags')
    .eq('user_id', userId)
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false });

  if (!breadcrumbs || breadcrumbs.length === 0) {
    return { cards_added: 0, cards_marked_stale: 0 };
  }

  const clusters = clusterByTagOverlap(breadcrumbs as Breadcrumb[], 3);

  let cardsAdded = 0;
  for (const cluster of clusters) {
    const clusterText = cluster
      .slice(0, 20)
      .map((b) => `[${b.occurred_at.slice(0, 10)}] ${b.summary}`)
      .join('\n');
    const tagSet = new Set<string>();
    cluster.forEach((b) => (b.tags ?? []).forEach((t) => tagSet.add(t)));

    try {
      const completion = await openai.chat.completions.create({
        model: PATTERN_MODEL,
        messages: [
          { role: 'system', content: PATTERN_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Cluster size: ${cluster.length}\nShared tags: ${[...tagSet].join(', ')}\n\nBreadcrumbs:\n${clusterText}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 400,
      });
      const raw_json = completion.choices[0]?.message.content ?? '{}';
      const parsed = JSON.parse(raw_json) as {
        is_pattern?: boolean;
        pattern_type?: string;
        title?: string;
        description?: string;
        confidence?: number;
      };
      if (!parsed.is_pattern || !parsed.pattern_type || !parsed.title || !parsed.description) continue;
      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0.4) continue;

      const firstObserved = cluster
        .map((b) => b.occurred_at)
        .sort()[0];

      const card: PatternCardInput = {
        user_id: userId,
        pattern_type: parsed.pattern_type.slice(0, 80),
        title: parsed.title.slice(0, 200),
        description: parsed.description.slice(0, 2000),
        source_breadcrumb_ids: cluster.map((b) => b.id),
        confidence: Math.min(1, Math.max(0, parsed.confidence)),
        first_observed_at: firstObserved,
      };

      await supabase.from('pattern_cards').insert(card);
      cardsAdded++;
    } catch (err) {
      console.error('[pattern-detector] cluster failed:', err);
    }
  }

  // Mark stale pattern cards inactive
  const staleCutoff = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('pattern_cards')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)
    .lt('last_refreshed_at', staleCutoff);

  return { cards_added: cardsAdded, cards_marked_stale: count ?? 0 };
}
