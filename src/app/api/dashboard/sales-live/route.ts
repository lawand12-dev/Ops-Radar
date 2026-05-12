import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import {
  fetchHubspotSalesData,
  type HubspotSalesData,
} from '<npm>/lib/integrations/hubspot/adapter';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:sales-live:${userId}`;

type SalesLiveResponse =
  | { status: 'ok'; data: HubspotSalesData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'requires_reconnect' }
  | { status: 'unavailable'; message: string };

function isHubspotAuthError(err: unknown): boolean {
  const x = err as { code?: number; statusCode?: number; status?: number; response?: { statusCode?: number } };
  const s = x?.code ?? x?.statusCode ?? x?.status ?? x?.response?.statusCode ?? null;
  return s === 401;
}

export async function GET(_req: NextRequest): Promise<NextResponse<SalesLiveResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data: row, error: readErr } = await supabase
    .from('integrations')
    .select('encrypted_token, iv, auth_tag, status, last_synced_at')
    .eq('client_id', userId)
    .eq('tool', 'hubspot')
    .maybeSingle();

  if (readErr) {
    console.error('[sales-live] integrations read failed:', readErr);
    return NextResponse.json({ status: 'unavailable', message: 'db_error' });
  }
  if (!row || !row.encrypted_token) {
    return NextResponse.json({ status: 'not_connected' });
  }
  if (row.status !== 'connected') {
    if (row.status !== 'requires_reconnect' && row.status !== 'revoked') {
      console.warn('[sales-live] unexpected integration status, treating as requires_reconnect:', row.status);
    }
    return NextResponse.json({ status: 'requires_reconnect' });
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (redis) {
    const cached = await redis.get<SalesLiveResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  let data: HubspotSalesData;
  try {
    const token = decryptApiKey({
      encrypted_token: row.encrypted_token,
      iv: row.iv,
      auth_tag: row.auth_tag,
    });
    data = await fetchHubspotSalesData(token);
  } catch (err) {
    if (isHubspotAuthError(err)) {
      await supabase
        .from('integrations')
        .update({ status: 'requires_reconnect', last_error: 'hubspot_auth_error' })
        .eq('client_id', userId)
        .eq('tool', 'hubspot');
      return NextResponse.json({ status: 'requires_reconnect' });
    }
    console.error('[sales-live] hubspot fetch failed:', err);
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
    .eq('tool', 'hubspot');

  const payload: SalesLiveResponse = {
    status: 'ok',
    data,
    last_synced_at: lastSyncedAt,
    from_cache: false,
  };
  if (redis) {
    await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  }
  return NextResponse.json(payload);
}
