// src/app/api/dashboard/diorization/seed-sample/route.ts
//
// Seeds the current user's brain with realistic sample data so the
// /dashboard/brain page is populated without waiting for real ingestion.
//
// Useful for:
//   - YC interview demos
//   - Internal product walkthroughs
//   - First-customer onboarding ("here's what your brain WILL look like")
//
// Idempotent in the loose sense: re-running adds more breadcrumbs +
// regenerates the brief. Not destructive — never deletes existing data.

import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { applyRateLimit } from '<npm>/lib/rate-limit';
import { synthesise } from '<npm>/lib/diorization/synthesizer';
import { detectPatternsForUser } from '<npm>/lib/diorization/pattern-detector';
import { generateLivingBrief } from '<npm>/lib/diorization/living-brief';
import type { Json } from '<npm>/lib/database.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

// Plausible-sounding agency conversation snippets across 3 sources.
const SAMPLE_CONVERSATIONS = [
  {
    source_type: 'slack' as const,
    source_ref: 'slack:sample/p1',
    occurred_at: daysAgo(2),
    participants: ['lawand', 'atta'],
    body: 'lawand: Client B is over budget by $4,200 this month — same pattern as Q4 last year when scope crept on the social side.\natta: Should we draft the conversation now? Last time we waited and they pushed back hard.\nlawand: Yes — Q4 expansion is happening again. Draft it.',
    consent_verified: true,
  },
  {
    source_type: 'slack' as const,
    source_ref: 'slack:sample/p2',
    occurred_at: daysAgo(9),
    participants: ['lawand', 'atta'],
    body: 'lawand: Client C wants another deliverable added to the retainer this week.\natta: That\'s the third time this quarter. Same pattern as last Q4.\nlawand: Note this — pattern is real. Q4 they always expand.',
    consent_verified: true,
  },
  {
    source_type: 'gmail' as const,
    source_ref: 'gmail:sample/t1',
    occurred_at: daysAgo(4),
    participants: ['sarah@acmeco.com', 'lawand@opsradar.co'],
    body: 'Subject: Q4 reporting cadence\n\nHey Lawand — we\'d like to expand the scope to include weekly reporting on top of the monthly. Can we discuss budget?\n\nSarah',
    consent_verified: true,
  },
  {
    source_type: 'gmail' as const,
    source_ref: 'gmail:sample/t2',
    occurred_at: daysAgo(15),
    participants: ['john@bayerpitch.com', 'lawand@opsradar.co'],
    body: 'Subject: Bayer pitch follow-up\n\nWe lost the digital scope on the Bayer pitch because we didn\'t mention DAM integration. Adding to standard deck for future pitches.\n\nJohn',
    consent_verified: true,
  },
  {
    source_type: 'zoom_transcript' as const,
    source_ref: 'zoom:sample/m1',
    occurred_at: daysAgo(7),
    participants: ['lawand', 'atta', 'sean'],
    body: 'Sean: We\'re losing money on Acme even though they\'re a high-revenue client. The hours aren\'t tracked properly.\nLawand: We\'ve seen this pattern across 3 clients now — high revenue, high hours, low margin. Need a system.\nAtta: I\'ll set up a margin watcher that flags clients under 15% margin.',
    consent_verified: true,
  },
  {
    source_type: 'slack' as const,
    source_ref: 'slack:sample/p3',
    occurred_at: daysAgo(20),
    participants: ['lawand', 'sarah'],
    body: 'Sarah: Heads up — Client D just asked for video work which isn\'t in their retainer.\nLawand: That\'s the Q4 expansion pattern again. Draft the scope conversation; do not just absorb the work.',
    consent_verified: true,
  },
  {
    source_type: 'slack' as const,
    source_ref: 'slack:sample/p4',
    occurred_at: daysAgo(28),
    participants: ['lawand', 'atta'],
    body: 'lawand: Capacity is at 97% this week. Sarah is at 110%. We can\'t take new work without burning her out.\natta: Push back ACME kickoff to next sprint?\nlawand: Yes. Note: utilization >95% should trigger an automatic capacity advisory.',
    consent_verified: true,
  },
  {
    source_type: 'gmail' as const,
    source_ref: 'gmail:sample/t3',
    occurred_at: daysAgo(35),
    participants: ['lawand@opsradar.co', 'team@opsradar.co'],
    body: 'Subject: Pipeline review — what\'s slowing us down?\n\nWe have $80K of paid MTD but $42K overdue. That\'s 52% — past the cash flow risk threshold. Need a collections sequence this week.',
    consent_verified: true,
  },
];

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const limited = await applyRateLimit(request, 'diorization-upload', userId);
  if (limited) return limited as NextResponse;

  const supabase = getServerSupabaseClient();

  // Ensure a sample-source row exists
  let sourceId: string;
  const { data: existing } = await supabase
    .from('ingestion_sources')
    .select('id')
    .eq('user_id', userId)
    .eq('source_label', 'OpsRadar sample data')
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    sourceId = existing.id;
  } else {
    const { data: created, error: srcErr } = await supabase
      .from('ingestion_sources')
      .insert({
        user_id: userId,
        source_type: 'manual_upload',
        source_label: 'OpsRadar sample data',
        status: 'active',
      })
      .select('id')
      .single();
    if (srcErr || !created) {
      return NextResponse.json({ error: 'source_insert_failed', details: srcErr?.message }, { status: 500 });
    }
    sourceId = created.id;
  }

  // Synthesise each sample conversation in parallel (small set; safe)
  const synthed = await Promise.all(
    SAMPLE_CONVERSATIONS.map((raw) => synthesise(userId, sourceId, raw)),
  );

  const rows = synthed.map((b) => ({
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

  const { error: insertErr } = await supabase.from('breadcrumbs').insert(rows);
  if (insertErr) {
    return NextResponse.json({ error: 'breadcrumb_insert_failed', details: insertErr.message }, { status: 500 });
  }

  await supabase
    .from('ingestion_sources')
    .update({
      last_synced_at: new Date().toISOString(),
      cursor: { last_sample_seed_at: new Date().toISOString() } as unknown as Json,
    })
    .eq('id', sourceId);

  // Trigger pattern detection + brief regeneration in line so the UI
  // shows a populated brain immediately
  const { cards_added, cards_marked_stale } = await detectPatternsForUser(userId);
  const brief = await generateLivingBrief(userId);

  return NextResponse.json({
    ok: true,
    source_id: sourceId,
    conversations_seeded: SAMPLE_CONVERSATIONS.length,
    breadcrumbs_inserted: rows.length,
    pattern_cards_added: cards_added,
    pattern_cards_marked_stale: cards_marked_stale,
    brief_version: brief?.version ?? null,
  });
}
