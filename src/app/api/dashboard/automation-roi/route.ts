import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

let redisInstance: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisInstance !== undefined) return redisInstance;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisInstance = null;
    return null;
  }
  try {
    redisInstance = new Redis({ url, token });
    return redisInstance;
  } catch (err) {
    console.warn('[automation-roi] Redis init failed, caching disabled:', err);
    redisInstance = null;
    return null;
  }
}

async function safeRedisGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try { return (await r.get<T>(key)) ?? null; } catch (err) {
    console.warn('[automation-roi] redis.get failed:', err);
    return null;
  }
}

async function safeRedisSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try { await r.set(key, value, { ex: ttlSeconds }); } catch (err) {
    console.warn('[automation-roi] redis.set failed:', err);
  }
}

const CACHE_TTL_SECONDS = 180;
const STALE_TTL_SECONDS = 60 * 60 * 24;

type CtoAnalyticsResponse = {
  overview: {
    total_projects: number;
    total_workflows: number;
    total_runs: number;
    failed_runs: number;
    success_rate: number;
    average_duration_ms: number;
    unresolved_alerts: number;
    healthy_workflows: number;
    unhealthy_workflows: number;
  };
  workflows_health: Array<{
    workflow_id: string;
    project_id: string;
    project_name: string;
    is_working: boolean;
    last_run_status: 'success' | 'failure' | 'unknown';
    failed_runs: number;
    total_runs: number;
    unresolved_alerts: number;
  }>;
};

type AutomationRoiWidget = {
  dollars_saved: number;
  hours_saved: number;
  actions_automated: number;
  success_rate_pct: number;
  total_workflows: number;
  open_alerts: number;
  healthy_count: number;
  failing_count: number;
  monitor_url: string;
};

type ApiResult =
  | { status: 'ok'; data: AutomationRoiWidget; fromCache: boolean }
  | { status: 'not_enrolled' }
  | { status: 'error'; message: string; staleData?: AutomationRoiWidget; staleAgeMs?: number };

function cacheKeys(userId: string) {
  return {
    fresh: `dash:automation-roi:${userId}`,
    stale: `dash:automation-roi:${userId}:stale`,
  };
}

function shape(raw: CtoAnalyticsResponse): AutomationRoiWidget {
  const minutesPerExec = Number(process.env.DEFAULT_MINUTES_PER_EXECUTION ?? 5);
  const hourlyRate = Number(process.env.DEFAULT_HOURLY_RATE_USD ?? 25);
  const monitorUrl = process.env.WORKFLOW_MONITOR_URL ?? 'https://opstest.atta.codes/#/projects';

  const successfulRuns = Math.max(0, raw.overview.total_runs - raw.overview.failed_runs);
  const hoursSaved = (successfulRuns * minutesPerExec) / 60;

  return {
    dollars_saved: hoursSaved * hourlyRate,
    hours_saved: hoursSaved,
    actions_automated: successfulRuns,
    success_rate_pct: raw.overview.success_rate,
    total_workflows: raw.overview.total_workflows,
    open_alerts: raw.overview.unresolved_alerts,
    healthy_count: raw.overview.healthy_workflows,
    failing_count: raw.overview.unhealthy_workflows,
    monitor_url: monitorUrl,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse<ApiResult>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'error', message: 'unauthorized' }, { status: 401 });
  }

  const apiUrl = process.env.CHATV2_API_URL;
  const serviceKey = process.env.CHATV2_SERVICE_API_KEY;
  if (!apiUrl || !serviceKey) {
    console.error('[automation-roi] CHATV2_API_URL or CHATV2_SERVICE_API_KEY missing');
    return NextResponse.json({ status: 'error', message: 'integration_not_configured' }, { status: 500 });
  }

  const keys = cacheKeys(userId);
  const fresh = req.nextUrl.searchParams.get('fresh') === '1';

  if (!fresh) {
    const cached = await safeRedisGet<{ data: AutomationRoiWidget; ts: number }>(keys.fresh);
    if (cached) {
      return NextResponse.json({ status: 'ok', data: cached.data, fromCache: true });
    }
  }

  // Look up this customer's chatv2 project
  const supabase = getServerSupabaseClient();
  const { data: mapping, error: mappingError } = await supabase
    .from('client_n8n_config')
    .select('chatv2_project_id')
    .eq('client_id', userId)
    .maybeSingle();

  if (mappingError) {
    console.error('[automation-roi] mapping lookup failed:', mappingError.message);
    return NextResponse.json({ status: 'error', message: 'mapping_lookup_failed' }, { status: 500 });
  }

  if (!mapping?.chatv2_project_id) {
    return NextResponse.json({ status: 'not_enrolled' });
  }

  let response: Response;
  try {
    response = await fetch(
      `${apiUrl}/service/projects/${encodeURIComponent(mapping.chatv2_project_id)}/analytics`,
      {
        headers: { Authorization: `Bearer ${serviceKey}` },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      }
    );
  } catch (err) {
    const stale = await safeRedisGet<{ data: AutomationRoiWidget; ts: number }>(keys.stale);
    return NextResponse.json({
      status: 'error',
      message: err instanceof Error ? err.message : 'chatv2 unreachable',
      ...(stale && { staleData: stale.data, staleAgeMs: Date.now() - stale.ts }),
    });
  }

  if (response.status === 404) {
    return NextResponse.json({ status: 'not_enrolled' });
  }

  if (!response.ok) {
    const stale = await safeRedisGet<{ data: AutomationRoiWidget; ts: number }>(keys.stale);
    return NextResponse.json({
      status: 'error',
      message: `chatv2 returned ${response.status}`,
      ...(stale && { staleData: stale.data, staleAgeMs: Date.now() - stale.ts }),
    });
  }

  let raw: CtoAnalyticsResponse;
  try {
    raw = (await response.json()) as CtoAnalyticsResponse;
    if (!raw?.overview || typeof raw.overview.total_runs !== 'number') {
      throw new Error('unexpected shape');
    }
  } catch {
    return NextResponse.json({ status: 'error', message: 'chatv2 returned unexpected shape' });
  }

  const data = shape(raw);
  const wrapped = { data, ts: Date.now() };
  await Promise.all([
    safeRedisSet(keys.fresh, wrapped, CACHE_TTL_SECONDS),
    safeRedisSet(keys.stale, wrapped, STALE_TTL_SECONDS),
  ]);

  return NextResponse.json({ status: 'ok', data, fromCache: false });
}
