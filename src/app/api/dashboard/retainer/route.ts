// Retainer API: list health, upsert config, delete config.
// Branch: main / Supabase. Gated to Pro+ tier.
import { NextResponse, type NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { fetchHarvestMonthlyProjectHours } from '<npm>/lib/integrations/harvest/adapter';
import {
  computeRetainerHealth,
  normalizeClientName,
  type RetainerConfig,
  type RetainerSummary,
} from '<npm>/lib/retainer';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const cacheKey = (uid: string) => `dash:retainer:${uid}`;

type RetainerResponse =
  | ({ status: 'ok'; from_cache: boolean } & RetainerSummary)
  | { status: 'no_configs'; configs: [] }
  | { status: 'harvest_not_connected'; configs: RetainerConfig[] }
  | { status: 'upgrade_required'; required_plan: string; required_plan_label: string; required_plan_price: string }
  | { status: 'unavailable'; message: string };

async function getAuthAndPlan(): Promise<
  { userId: string; allowed: true } | { allowed: false; response: NextResponse }
> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      allowed: false,
      response: NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 }),
    };
  }

  const session = await getSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  const plan = getUserPlan(user?.user_metadata ?? null);
  if (!canAccess(plan, 'retainer')) {
    return {
      allowed: false,
      response: NextResponse.json(upgradeRequiredBody('pro'), { status: 402 }),
    };
  }

  return { userId, allowed: true };
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try { return new Redis({ url, token }); } catch { return null; }
}

export async function GET(): Promise<NextResponse<RetainerResponse>> {
  const auth = await getAuthAndPlan();
  if (!auth.allowed) return auth.response as NextResponse<RetainerResponse>;
  const { userId } = auth;

  const supabase = getServerSupabaseClient();

  const { data: configRows, error: configErr } = await supabase
    .from('retainer_configs')
    .select('id, client_name_display, client_name_norm, monthly_amount_usd, included_hours')
    .eq('user_id', userId);

  if (configErr) {
    console.error('[retainer] configs lookup failed:', configErr.message);
    return NextResponse.json({ status: 'unavailable', message: 'configs_lookup_failed' }, { status: 500 });
  }

  const configs: RetainerConfig[] = (configRows ?? []).map((r) => ({
    id: r.id as string,
    client_name_display: r.client_name_display as string,
    client_name_norm: r.client_name_norm as string,
    monthly_amount_usd: Number(r.monthly_amount_usd),
    included_hours: Number(r.included_hours),
  }));

  if (configs.length === 0) {
    return NextResponse.json({ status: 'no_configs', configs: [] });
  }

  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get<RetainerSummary>(cacheKey(userId));
      if (cached) return NextResponse.json({ status: 'ok', ...cached, from_cache: true });
    } catch {
      // cache miss is fine
    }
  }

  const { data: harvestRow } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('tool', 'harvest')
    .eq('status', 'connected')
    .maybeSingle();

  if (!harvestRow?.encrypted_token) {
    return NextResponse.json({ status: 'harvest_not_connected', configs });
  }

  try {
    const harvestData = await fetchHarvestMonthlyProjectHours(decryptApiKey(harvestRow));
    const summary = computeRetainerHealth(configs, harvestData);

    if (redis) {
      try { await redis.set(cacheKey(userId), summary, { ex: CACHE_TTL_SECONDS }); } catch {}
    }

    return NextResponse.json({ status: 'ok', ...summary, from_cache: false });
  } catch (err) {
    console.error('[retainer] harvest fetch failed:', err);
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthAndPlan();
  if (!auth.allowed) return auth.response;
  const { userId } = auth;

  let body: { client_name?: string; monthly_amount_usd?: number; included_hours?: number };
  try {
    body = (await request.json()) as { client_name?: string; monthly_amount_usd?: number; included_hours?: number };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.client_name?.trim()) {
    return NextResponse.json({ error: 'client_name required' }, { status: 400 });
  }
  if (typeof body.monthly_amount_usd !== 'number' || body.monthly_amount_usd < 0) {
    return NextResponse.json({ error: 'monthly_amount_usd must be >= 0' }, { status: 400 });
  }
  if (typeof body.included_hours !== 'number' || body.included_hours < 0) {
    return NextResponse.json({ error: 'included_hours must be >= 0' }, { status: 400 });
  }

  const norm = normalizeClientName(body.client_name);
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from('retainer_configs')
    .upsert(
      {
        user_id: userId,
        client_name_display: body.client_name.trim(),
        client_name_norm: norm,
        monthly_amount_usd: body.monthly_amount_usd,
        included_hours: body.included_hours,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,client_name_norm' },
    )
    .select()
    .single();

  if (error) {
    console.error('[retainer] upsert failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const redis = getRedis();
  if (redis) {
    try { await redis.del(cacheKey(userId)); } catch {}
  }

  return NextResponse.json({ ok: true, config: data });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthAndPlan();
  if (!auth.allowed) return auth.response;
  const { userId } = auth;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('retainer_configs')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('[retainer] delete failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const redis = getRedis();
  if (redis) {
    try { await redis.del(cacheKey(userId)); } catch {}
  }

  return NextResponse.json({ ok: true });
}
