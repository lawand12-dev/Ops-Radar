import { NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import {
  fetchHarvestTimeData,
  type HarvestTimeData,
} from '<npm>/lib/integrations/harvest/adapter';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:time-harvest:${userId}`;

type Resp =
  | { status: 'ok'; data: HarvestTimeData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'unavailable'; message: string };

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data: row } = await supabase
    .from('integrations')
    .select('encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('tool', 'harvest')
    .maybeSingle();

  if (!row?.encrypted_token || row.status !== 'connected') {
    return NextResponse.json({ status: 'not_connected' });
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (redis) {
    const cached = await redis.get<Resp>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  let data: HarvestTimeData;
  try {
    const combined = decryptApiKey({
      encrypted_token: row.encrypted_token,
      iv: row.iv,
      auth_tag: row.auth_tag,
    });
    data = await fetchHarvestTimeData(combined);
  } catch (err) {
    console.error('[time-harvest] fetch failed:', err);
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
    .eq('tool', 'harvest');

  const payload: Resp = { status: 'ok', data, last_synced_at: lastSyncedAt, from_cache: false };
  if (redis) await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(payload);
}
