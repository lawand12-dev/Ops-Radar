// src/app/api/dashboard/runs/[id]/route.ts
//
// CP-14 Day 4a — single-run drawer detail.
//
// Returns the agent_runs row + the agent_actions queued during the run
// window (joined by user_id + agent_slug + time bracket). The drawer
// in /dashboard/runs renders these as expandable step entries.

import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Bracket actions whose created_at falls within (started_at - 1min, ended_at + 5min)
// — slack for cron drift and slow approval-gate queueing.
const PRE_PAD_MS = 60 * 1000;
const POST_PAD_MS = 5 * 60 * 1000;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const supabase = await getSessionSupabaseClient();

  const { data: run, error: runErr } = await supabase
    .from('agent_runs')
    .select(
      'id, agent_slug, status, started_at, ended_at, summary, ' +
      'actions_taken, patterns_detected, risks_flagged, notion_writes, ' +
      'tokens_used, cost_cents, error_message',
    )
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (runErr || !run) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Pull any actions this agent queued in the run window so the drawer can
  // show them as the run's "outputs". The schema doesn't have a hard FK from
  // action → run, so we bracket by time + agent_slug.
  const startedAt = run.started_at ? new Date(run.started_at).getTime() : 0;
  const endedAtRaw = run.ended_at ? new Date(run.ended_at).getTime() : Date.now();
  const fromIso = new Date(startedAt - PRE_PAD_MS).toISOString();
  const toIso = new Date(endedAtRaw + POST_PAD_MS).toISOString();

  const { data: actions } = await supabase
    .from('agent_actions')
    .select('id, action_type, status, payload, created_at, executed_at, rejected_at')
    .eq('user_id', userId)
    .eq('agent_slug', run.agent_slug)
    .gte('created_at', fromIso)
    .lte('created_at', toIso)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    run,
    actions: actions ?? [],
  });
}
