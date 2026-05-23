import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import {
  safeExecuteComposioAction,
  ComposioExecuteError,
} from '<npm>/lib/composio-fetch';
import type { PipedriveSalesData } from '<npm>/lib/integration-types';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:sales-pipedrive:${userId}`;

type Resp =
  | { status: 'ok'; data: PipedriveSalesData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'unavailable'; message: string };

type PipedriveDeal = {
  id: number;
  title: string;
  value: number;
  currency: string;
  status: string;
  stage_id?: number;
  expected_close_date?: string | null;
  won_time?: string | null;
};

type PipedriveStage = { id: number; name: string };

type PipedriveListDealsResp = { data?: PipedriveDeal[] | null };
type PipedriveListStagesResp = { data?: PipedriveStage[] | null };

function shape(
  openDeals: PipedriveDeal[],
  wonDeals: PipedriveDeal[],
  stages: PipedriveStage[],
): PipedriveSalesData {
  const stageNameById = new Map<number, string>(stages.map((s) => [s.id, s.name]));

  const pipelineValue = openDeals.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const openDealsCount = openDeals.length;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const dealsWonThisMonth = wonDeals.filter(
    (d) => d.won_time && new Date(d.won_time) >= monthStart,
  ).length;

  const currency = openDeals[0]?.currency ?? 'USD';

  const rows: PipedriveSalesData['rows'] = openDeals
    .slice()
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
    .slice(0, 5)
    .map((d) => ({
      id: String(d.id),
      title: d.title,
      value: Number(d.value) || 0,
      currency: d.currency ?? currency,
      stage:
        d.stage_id != null
          ? (stageNameById.get(d.stage_id) ?? `Stage ${d.stage_id}`)
          : 'unknown',
      expected_close: d.expected_close_date ?? null,
    }));

  return {
    pipeline_value: pipelineValue,
    open_deals_count: openDealsCount,
    deals_won_this_month: dealsWonThisMonth,
    rows,
    currency,
  };
}

export async function GET(_req: NextRequest): Promise<NextResponse<Resp>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
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

  let openResp: PipedriveListDealsResp | null;
  let wonResp: PipedriveListDealsResp | null;
  let stagesResp: PipedriveListStagesResp | null;
  try {
    [openResp, wonResp, stagesResp] = await Promise.all([
      // TODO(composio-slug): verify PIPEDRIVE_LIST_DEALS action + arg names
      safeExecuteComposioAction<PipedriveListDealsResp>(
        userId,
        'pipedrive',
        'PIPEDRIVE_LIST_DEALS',
        { status: 'open', limit: 100 },
      ),
      // TODO(composio-slug): verify PIPEDRIVE_LIST_DEALS action + arg names
      safeExecuteComposioAction<PipedriveListDealsResp>(
        userId,
        'pipedrive',
        'PIPEDRIVE_LIST_DEALS',
        { status: 'won', limit: 100 },
      ),
      // TODO(composio-slug): verify PIPEDRIVE_LIST_STAGES action
      safeExecuteComposioAction<PipedriveListStagesResp>(
        userId,
        'pipedrive',
        'PIPEDRIVE_LIST_STAGES',
        {},
      ),
    ]);
  } catch (err) {
    const message =
      err instanceof ComposioExecuteError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'fetch_failed';
    console.error('[sales-pipedrive] composio fetch failed:', err);
    return NextResponse.json({ status: 'unavailable', message });
  }

  // No Composio connection at all → all three returned null.
  if (openResp === null && wonResp === null && stagesResp === null) {
    return NextResponse.json({ status: 'not_connected' });
  }

  const data = shape(openResp?.data ?? [], wonResp?.data ?? [], stagesResp?.data ?? []);

  const lastSyncedAt = new Date().toISOString();
  const payload: Resp = { status: 'ok', data, last_synced_at: lastSyncedAt, from_cache: false };
  if (redis) await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(payload);
}
