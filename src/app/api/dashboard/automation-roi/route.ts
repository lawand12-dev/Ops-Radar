import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const redis = Redis.fromEnv();
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
  | { status: 'error'; message: string; staleData?: AutomationRoiWidget; staleAgeMs?: number };

const CACHE_KEY = 'dash:automation-roi';
const STALE_KEY = `${CACHE_KEY}:stale`;

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
  const fresh = req.nextUrl.searchParams.get('fresh') === '1';

  if (!fresh) {
    const cached = await redis.get<{ data: AutomationRoiWidget; ts: number }>(CACHE_KEY);
    if (cached) {
      return NextResponse.json({ status: 'ok', data: cached.data, fromCache: true });
    }
  }

  const baseUrl = process.env.CTO_BACKEND_URL;
  if (!baseUrl) {
    return NextResponse.json({ status: 'error', message: 'CTO_BACKEND_URL not configured' });
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/analytics`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
  } catch (err) {
    const stale = await redis.get<{ data: AutomationRoiWidget; ts: number }>(STALE_KEY);
    return NextResponse.json({
      status: 'error',
      message: err instanceof Error ? err.message : 'CTO backend unreachable',
      ...(stale && { staleData: stale.data, staleAgeMs: Date.now() - stale.ts }),
    });
  }

  if (!response.ok) {
    const stale = await redis.get<{ data: AutomationRoiWidget; ts: number }>(STALE_KEY);
    return NextResponse.json({
      status: 'error',
      message: `CTO backend returned ${response.status}`,
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
    return NextResponse.json({
      status: 'error',
      message: 'CTO backend returned an unexpected response shape',
    });
  }

  const data = shape(raw);
  const wrapped = { data, ts: Date.now() };
  await Promise.all([
    redis.set(CACHE_KEY, wrapped, { ex: CACHE_TTL_SECONDS }),
    redis.set(STALE_KEY, wrapped, { ex: STALE_TTL_SECONDS }),
  ]);

  return NextResponse.json({ status: 'ok', data, fromCache: false });
}
