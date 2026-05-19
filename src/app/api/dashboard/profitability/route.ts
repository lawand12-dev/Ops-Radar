import { NextResponse } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter';
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter';
import { computeClientProfitability, type ProfitabilityResult } from '<npm>/lib/profitability';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 30;
const CACHE_KEY = (userId: string) => `dash:profitability:${userId}`;
const DEFAULT_BLENDED_RATE = 85;

type ProfitabilityResponse =
  | { status: 'ok'; data: ProfitabilityResult; blended_rate_usd: number; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected'; missing: ('stripe' | 'harvest')[] }
  | { status: 'upgrade_required'; required_plan: string; required_plan_label: string; required_plan_price: string }
  | { status: 'unavailable'; message: string };

export async function GET(): Promise<NextResponse<ProfitabilityResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const sessionSupabase = await getSessionSupabaseClient();
  const { data: userData } = await sessionSupabase.auth.getUser();
  const meta = (userData?.user?.user_metadata ?? {}) as Record<string, unknown>;

  const plan = getUserPlan(meta);
  if (!canAccess(plan, 'profitability')) {
    return NextResponse.json(upgradeRequiredBody('growth'), { status: 402 });
  }

  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
    ? meta.blended_hourly_rate_usd
    : DEFAULT_BLENDED_RATE;

  const supabase = getServerSupabaseClient();
  const { data: integrations } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .in('tool', ['stripe', 'harvest']);

  const stripeRow = integrations?.find((r) => r.tool === 'stripe');
  const harvestRow = integrations?.find((r) => r.tool === 'harvest');

  const missing: ('stripe' | 'harvest')[] = [];
  if (!stripeRow?.encrypted_token || stripeRow.status !== 'connected') missing.push('stripe');
  if (!harvestRow?.encrypted_token || harvestRow.status !== 'connected') missing.push('harvest');

  if (missing.length === 2) {
    return NextResponse.json({ status: 'not_connected', missing });
  }

  const redis = (() => { try { return Redis.fromEnv(); } catch { return null; } })();
  if (redis && missing.length === 0) {
    const cached = await redis.get<ProfitabilityResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  try {
    const [stripeData, harvestData] = await Promise.all([
      stripeRow?.encrypted_token && stripeRow.status === 'connected'
        ? fetchStripePerClientRevenue(decryptApiKey(stripeRow))
        : Promise.resolve({ clients: [], currency: 'USD' as const }),
      harvestRow?.encrypted_token && harvestRow.status === 'connected'
        ? fetchHarvestPerClientHours(decryptApiKey(harvestRow))
        : Promise.resolve({ clients: [] }),
    ]);

    const data = computeClientProfitability(stripeData, harvestData, blendedRate);
    const lastSyncedAt = new Date().toISOString();

    const payload: ProfitabilityResponse = {
      status: 'ok',
      data,
      blended_rate_usd: blendedRate,
      last_synced_at: lastSyncedAt,
      from_cache: false,
    };

    if (redis && missing.length === 0) {
      await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[profitability] fetch failed:', err);
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    });
  }
}
