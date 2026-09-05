// src/app/api/cron/diorize/route.ts
//
// Daily diorize cron. For each user with active ingestion_sources, runs
// the end-to-end diorize pipeline (ingest → synthesise → patterns → brief).
//
// Schedule (vercel.json): "0 3 * * *" — 3am UTC daily.

import { getServerSupabaseClient, hasServerSupabaseClient } from '<npm>/lib/supabase-server';
import { serverErrorResponse } from '<npm>/lib/security';
import { diorizeUserOnce } from '<npm>/lib/diorization/runner';

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET) {
    console.error('[diorize cron] missing CRON_SECRET');
    return serverErrorResponse();
  }
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasServerSupabaseClient()) return serverErrorResponse();

  const supabase = getServerSupabaseClient();

  // Find users with at least one active source
  const { data: rows } = await supabase
    .from('ingestion_sources')
    .select('user_id')
    .eq('status', 'active');

  const userIds = [...new Set((rows ?? []).map((r: { user_id: string }) => r.user_id))];

  const stats = { processed: 0, errors: 0, total_breadcrumbs: 0, total_patterns: 0 };

  for (const userId of userIds) {
    try {
      const out = await diorizeUserOnce(userId);
      stats.processed++;
      stats.total_breadcrumbs += out.breadcrumbs_inserted;
      stats.total_patterns += out.pattern_cards_added;
      console.log('[diorize cron]', out);
    } catch (err) {
      console.error('[diorize cron] error for', userId, err);
      stats.errors++;
    }
  }

  console.log('[diorize cron] done', stats);
  return Response.json({ ok: true, stats });
}
