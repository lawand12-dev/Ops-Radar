// src/lib/diorization/runner.ts
//
// End-to-end diorize run for one user:
//   1. For each active ingestion_source, call its adapter to fetch new raw conversations
//   2. For each conversation, run synthesise() → BreadcrumbInput
//   3. Bulk-insert breadcrumbs
//   4. Update the source's last_synced_at + cursor
//   5. Run pattern-detector to refresh pattern_cards
//   6. Generate / refresh the living brief
//
// Called by the /api/cron/diorize cron route — once per day per user.

import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { synthesise } from './synthesizer';
import { detectPatternsForUser } from './pattern-detector';
import { generateLivingBrief } from './living-brief';
import { slackAdapter } from './adapters/slack';
import { gmailAdapter } from './adapters/gmail';
import type { IngestionAdapter, BreadcrumbInput } from './types';
import type { Json } from '<npm>/lib/database.types';

const ADAPTERS: Record<string, IngestionAdapter> = {
  slack: slackAdapter,
  gmail: gmailAdapter,
  // zoom_transcript + notion + manual_upload to follow
};

export async function diorizeUserOnce(userId: string): Promise<{
  user_id: string;
  ingested: number;
  breadcrumbs_inserted: number;
  pattern_cards_added: number;
  pattern_cards_marked_stale: number;
  brief_version: number | null;
}> {
  const supabase = getServerSupabaseClient();

  // 1. Load active sources for this user
  const { data: sources } = await supabase
    .from('ingestion_sources')
    .select('id, source_type, oauth_state, cursor, status')
    .eq('user_id', userId)
    .eq('status', 'active');

  let ingestedTotal = 0;
  const breadcrumbInputs: BreadcrumbInput[] = [];

  for (const src of sources ?? []) {
    const adapter = ADAPTERS[src.source_type];
    if (!adapter) continue;
    try {
      const { conversations, nextCursor } = await adapter.ingest({
        userId,
        sourceId: src.id,
        cursor: src.cursor as Record<string, unknown> | null,
        oauthState: src.oauth_state as Record<string, unknown> | null,
      });
      ingestedTotal += conversations.length;

      for (const raw of conversations) {
        const breadcrumb = await synthesise(userId, src.id, raw);
        breadcrumbInputs.push(breadcrumb);
      }

      await supabase
        .from('ingestion_sources')
        .update({
          last_synced_at: new Date().toISOString(),
          cursor: (nextCursor as unknown as Json) ?? null,
        })
        .eq('id', src.id);
    } catch (err) {
      console.error('[diorize] adapter failed', src.source_type, err);
      await supabase
        .from('ingestion_sources')
        .update({ status: 'error', last_error: (err as Error)?.message ?? 'unknown' })
        .eq('id', src.id);
    }
  }

  // 2. Bulk-insert breadcrumbs (filter out skipped/redacted if you want them
  // visible, leave as-is — they show as "skipped: consent not verified")
  let breadcrumbsInserted = 0;
  if (breadcrumbInputs.length > 0) {
    // Cast embedding array → JSON string for pgvector via .insert()
    const rows = breadcrumbInputs.map((b) => ({
      user_id: b.user_id,
      source_id: b.source_id,
      source_type: b.source_type,
      source_ref: b.source_ref,
      occurred_at: b.occurred_at,
      participants: b.participants,
      summary: b.summary,
      tags: b.tags,
      consent_verified: b.consent_verified,
      embedding: b.embedding ? (b.embedding as unknown as string) : null,
    }));
    const { count } = await supabase.from('breadcrumbs').insert(rows);
    breadcrumbsInserted = count ?? 0;
  }

  // 3. Detect patterns (cheap if no new breadcrumbs)
  const { cards_added, cards_marked_stale } = await detectPatternsForUser(userId);

  // 4. Regenerate living brief if any new signal
  let briefVersion: number | null = null;
  if (breadcrumbsInserted > 0 || cards_added > 0) {
    const brief = await generateLivingBrief(userId);
    briefVersion = brief?.version ?? null;
  }

  return {
    user_id: userId,
    ingested: ingestedTotal,
    breadcrumbs_inserted: breadcrumbsInserted,
    pattern_cards_added: cards_added,
    pattern_cards_marked_stale: cards_marked_stale,
    brief_version: briefVersion,
  };
}
