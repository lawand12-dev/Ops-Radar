import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import {
  fetchStripeFinanceData,
  type StripeFinanceData,
} from '<npm>/lib/integrations/stripe/adapter';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const STALE_TTL_SECONDS = 24 * 60 * 60;
const CACHE_KEY = (userId: string) => `dash:finance:${userId}`;
const STALE_KEY = (userId: string) => `dash:finance:${userId}:stale`;

type FinanceResponse =
  | { status: 'ok'; data: StripeFinanceData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'requires_reconnect' }
  | { status: 'unavailable'; message: string };

function isStripeAuthError(err: unknown): boolean {
  const e = err as { type?: string; statusCode?: number };
  return e?.type === 'StripeAuthenticationError' || e?.statusCode === 401;
}

export async function GET(_req: NextRequest): Promise<NextResponse<FinanceResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data: row, error: readErr } = await supabase
    .from('integrations')
    .select('encrypted_token, iv, auth_tag, status, last_synced_at')
    .eq('client_id', userId)
    .eq('tool', 'stripe')
    .maybeSingle();

  if (readErr) {
    console.error('[finance] integrations read failed:', readErr);
    return NextResponse.json({ status: 'unavailable', message: 'db_error' });
  }
  if (!row || !row.encrypted_token) {
    return NextResponse.json({ status: 'not_connected' });
  }
  if (row.status !== 'connected') {
    if (row.status !== 'requires_reconnect' && row.status !== 'revoked') {
      console.warn('[finance] unexpected integration status, treating as requires_reconnect:', row.status);
    }
    return NextResponse.json({ status: 'requires_reconnect' });
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (redis) {
    const cached = await redis.get<FinanceResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  let data: StripeFinanceData;
  try {
    const apiKey = decryptApiKey({
      encrypted_token: row.encrypted_token,
      iv: row.iv,
      auth_tag: row.auth_tag,
    });
    data = await fetchStripeFinanceData(apiKey);
  } catch (err) {
    if (isStripeAuthError(err)) {
      await supabase
        .from('integrations')
        .update({ status: 'requires_reconnect', last_error: 'stripe_auth_error' })
        .eq('client_id', userId)
        .eq('tool', 'stripe');
      return NextResponse.json({ status: 'requires_reconnect' });
    }
    console.error('[finance] stripe fetch failed:', err);
    if (redis) {
      const stale = await redis.get<FinanceResponse>(STALE_KEY(userId));
      if (stale && stale.status === 'ok') {
        return NextResponse.json({ ...stale, from_cache: true });
      }
    }
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
    .eq('tool', 'stripe');

  const payload: FinanceResponse = {
    status: 'ok',
    data,
    last_synced_at: lastSyncedAt,
    from_cache: false,
  };
  if (redis) {
    await Promise.all([
      redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS }),
      redis.set(STALE_KEY(userId), payload, { ex: STALE_TTL_SECONDS }),
    ]);
  }
  return NextResponse.json(payload);
}
