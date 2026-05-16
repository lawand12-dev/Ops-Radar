import { NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import {
  fetchTogglTimeData,
  type TogglTimeData,
} from '<npm>/lib/integrations/toggl/adapter';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:time:${userId}`;

type TimeResponse =
  | { status: 'ok'; data: TogglTimeData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'unavailable'; message: string };

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { status: 'unavailable', message: 'unauthorized' },
      { status: 401 },
    );
  }

  const supabase = getServerSupabaseClient();
  const { data: row } = await supabase
    .from('integrations')
    .select('encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('tool', 'toggl')
    .maybeSingle();

  if (!row?.encrypted_token || row.status !== 'connected') {
    return NextResponse.json({ status: 'not_connected' });
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (redis) {
    const cached = await redis.get<TimeResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  let data: TogglTimeData;
  try {
    const apiToken = decryptApiKey({
      encrypted_token: row.encrypted_token,
      iv: row.iv,
      auth_tag: row.auth_tag,
    });
    data = await fetchTogglTimeData(apiToken);
  } catch (err) {
    console.error('[time-tracking] toggl fetch failed:', err);
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    });
  }

  const lastSyncedAt = new Date().toISOString();
  await supabase
    .from('integrations')
    .update({ last_synced_at: lastSyncedAt, last_error: null })
    .eq('client_id', userId)
    .eq('tool', 'toggl');

  const payload: TimeResponse = {
    status: 'ok',
    data,
    last_synced_at: lastSyncedAt,
    from_cache: false,
  };
  if (redis) await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(payload);
}
