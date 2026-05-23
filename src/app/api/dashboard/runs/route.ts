// src/app/api/dashboard/runs/route.ts
//
// CP-14 Day 4a — the runs history surface.
//
// Returns a paginated list of the customer's agent runs (one row per
// scheduled cron execution). Filterable by status (success / failed /
// skipped / running) and agent_slug. The drawer detail endpoint lives at
// /api/dashboard/runs/[id] and joins in any actions queued during the run.

import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get('status');     // optional: success | failed | skipped | running
  const agent = url.searchParams.get('agent');       // optional: agent_slug
  const limit = Math.min(
    Math.max(Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT), 1),
    MAX_LIMIT,
  );
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);

  const supabase = await getSessionSupabaseClient();
  let q = supabase
    .from('agent_runs')
    .select('id, agent_slug, status, started_at, ended_at, summary, actions_taken, patterns_detected, risks_flagged, notion_writes, tokens_used, cost_cents, error_message', { count: 'exact' })
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) q = q.eq('status', status);
  if (agent) q = q.eq('agent_slug', agent);

  const { data, count, error } = await q;
  if (error) {
    console.error('[runs] list query failed:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({
    runs: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
