import { getServerSupabaseClient, hasServerSupabaseClient } from '<npm>/lib/supabase-server';
import { serverErrorResponse } from '<npm>/lib/security';
import { evaluateActionsForUser } from '<npm>/lib/actions/evaluator';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET) {
    console.error('[actions cron] missing CRON_SECRET');
    return serverErrorResponse();
  }
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasServerSupabaseClient()) return serverErrorResponse();
  const supabase = getServerSupabaseClient();

  const { data: rows } = await supabase
    .from('integrations')
    .select('client_id')
    .eq('status', 'connected')
    .not('encrypted_token', 'is', null);

  const userIds = [...new Set((rows ?? []).map((r: { client_id: string }) => r.client_id))];

  const stats = { evaluated: 0, errors: 0 };

  for (const userId of userIds) {
    try {
      await evaluateActionsForUser(userId);
      stats.evaluated++;
    } catch (err) {
      console.error('[actions cron] error for', userId, err);
      stats.errors++;
    }
  }

  console.log('[actions cron] done', stats);
  return Response.json({ ok: true, stats });
}
