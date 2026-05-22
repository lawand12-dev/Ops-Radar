// src/app/api/dashboard/diorization/upload/route.ts
//
// Manual upload endpoint for the diorization pipeline.
// Customer (or operator) POSTs a JSON file matching one of the supported
// shapes; we parse → synthesise → insert breadcrumbs in line. Pattern
// detection + living brief regeneration happen on the next diorize cron.
//
// Body:
//   { shape: 'slack' | 'gmail' | 'zoom_transcript',
//     source_label: 'string label for the ingestion source',
//     payload: <the parsed JSON of the export> }

import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { applyRateLimit } from '<npm>/lib/rate-limit';
import { parseManualUpload, type ManualUploadShape } from '<npm>/lib/diorization/adapters/manual-upload';
import { synthesise } from '<npm>/lib/diorization/synthesizer';
import type { Json } from '<npm>/lib/database.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const VALID_SHAPES = new Set<ManualUploadShape>(['slack', 'gmail', 'zoom_transcript']);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const limited = await applyRateLimit(request, 'diorization-upload', userId);
  if (limited) return limited as NextResponse;

  let body: { shape?: string; source_label?: string; payload?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const shape = body.shape as ManualUploadShape;
  if (!shape || !VALID_SHAPES.has(shape)) {
    return NextResponse.json({ error: 'invalid_shape', allowed: [...VALID_SHAPES] }, { status: 400 });
  }
  if (body.payload === undefined) {
    return NextResponse.json({ error: 'missing_payload' }, { status: 400 });
  }

  const conversations = parseManualUpload(shape, body.payload);
  if (conversations.length === 0) {
    return NextResponse.json({ ok: true, conversations_parsed: 0, breadcrumbs_inserted: 0 });
  }

  const supabase = getServerSupabaseClient();

  // Find or create the ingestion source row for this user + shape
  let sourceId: string | null = null;
  const { data: existing } = await supabase
    .from('ingestion_sources')
    .select('id')
    .eq('user_id', userId)
    .eq('source_type', shape)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    sourceId = existing.id;
  } else {
    const { data: created } = await supabase
      .from('ingestion_sources')
      .insert({
        user_id: userId,
        source_type: shape,
        source_label: body.source_label ?? `Manual upload: ${shape}`,
        status: 'active',
      })
      .select('id')
      .single();
    sourceId = created?.id ?? null;
  }

  // Synthesise each conversation (parallel with concurrency cap)
  const breadcrumbs = [];
  const CONCURRENCY = 4;
  for (let i = 0; i < conversations.length; i += CONCURRENCY) {
    const batch = conversations.slice(i, i + CONCURRENCY);
    const synthed = await Promise.all(batch.map((raw) => synthesise(userId, sourceId, raw)));
    breadcrumbs.push(...synthed);
  }

  const rows = breadcrumbs.map((b) => ({
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

  const { error } = await supabase.from('breadcrumbs').insert(rows);
  if (error) {
    return NextResponse.json({ error: 'insert_failed', details: error.message }, { status: 500 });
  }

  // Mark the source as synced
  await supabase
    .from('ingestion_sources')
    .update({ last_synced_at: new Date().toISOString(), cursor: { last_manual_upload_at: new Date().toISOString() } as unknown as Json })
    .eq('id', sourceId!);

  return NextResponse.json({
    ok: true,
    shape,
    source_id: sourceId,
    conversations_parsed: conversations.length,
    breadcrumbs_inserted: rows.length,
    note: 'Pattern detection + living brief regeneration will run on the next diorize cron (3am UTC).',
  });
}
