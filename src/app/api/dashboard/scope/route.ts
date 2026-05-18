// src/app/api/dashboard/scope/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { fetchClickupProjectBudgets } from '<npm>/lib/integrations/clickup/scope-adapter';
import { fetchHarvestMonthlyProjectHours } from '<npm>/lib/integrations/harvest/adapter';
import { computeScopeCreep, type ScopeCreepResult } from '<npm>/lib/scope-creep';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:scope:${userId}`;

type ScopeResponse =
  | { status: 'ok'; data: ScopeCreepResult; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected'; missing: ('clickup' | 'harvest')[] }
  | { status: 'unavailable'; message: string };

export async function GET(): Promise<NextResponse<ScopeResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data: integrations } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .in('tool', ['clickup', 'harvest']);

  const clickupRow = integrations?.find((r) => r.tool === 'clickup');
  const harvestRow = integrations?.find((r) => r.tool === 'harvest');

  const missing: ('clickup' | 'harvest')[] = [];
  if (!clickupRow?.encrypted_token || clickupRow.status !== 'connected') missing.push('clickup');
  if (!harvestRow?.encrypted_token || harvestRow.status !== 'connected') missing.push('harvest');

  if (missing.length === 2) {
    return NextResponse.json({ status: 'not_connected', missing });
  }

  const redis = (() => { try { return Redis.fromEnv(); } catch { return null; } })();
  if (redis && missing.length === 0) {
    const cached = await redis.get<ScopeResponse>(CACHE_KEY(userId));
    if (cached?.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  try {
    const [clickupData, harvestData] = await Promise.all([
      clickupRow?.encrypted_token && clickupRow.status === 'connected'
        ? fetchClickupProjectBudgets(decryptApiKey(clickupRow))
        : Promise.resolve({ projects: [] }),
      harvestRow?.encrypted_token && harvestRow.status === 'connected'
        ? fetchHarvestMonthlyProjectHours(decryptApiKey(harvestRow))
        : Promise.resolve({ projects: [] }),
    ]);

    const data = computeScopeCreep(clickupData, harvestData);
    const last_synced_at = new Date().toISOString();
    const payload: ScopeResponse = { status: 'ok', data, last_synced_at, from_cache: false };

    if (redis && missing.length === 0) {
      await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[scope] fetch failed:', err);
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    });
  }
}
