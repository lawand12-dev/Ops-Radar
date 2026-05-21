import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { Redis } from '@upstash/redis';
import {
  stripeAuthErrorRule,
  elevatedErrorRateRule,
  stuckDealRule,
  failingWorkflowRule,
  emptyCalendarRule,
  scopeCreepRule,
  sortAlertsBySeverity,
  MAX_COCKPIT_ALERTS,
  type DashboardAlert,
} from '<npm>/lib/dashboard-alert-rules';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes per spec

type AlertsResponse = { status: 'ok' | 'unavailable'; alerts?: DashboardAlert[]; message?: string };

async function fetchJson(request: NextRequest, ep: string): Promise<unknown> {
  const origin = new URL(request.url).origin;
  const res = await fetch(`${origin}/api/dashboard/${ep}`, {
    headers: { cookie: request.headers.get('cookie') ?? '' },
    cache: 'no-store',
  });
  if (!res.ok && res.status !== 503) throw new Error(`${ep} ${res.status}`);
  return res.json();
}

export async function GET(request: NextRequest): Promise<NextResponse<AlertsResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });

  const redis = (() => { try { return Redis.fromEnv(); } catch { return null; } })();
  const key = `dashboard:alerts:${userId}`;
  if (redis) {
    const cached = await redis.get<AlertsResponse>(key);
    if (cached?.status === 'ok') return NextResponse.json(cached);
  }

  const settled = await Promise.allSettled([
    fetchJson(request, 'finance'),
    fetchJson(request, 'sales-live'),
    fetchJson(request, 'workflow-health'),
    fetchJson(request, 'marketing'),
    fetchJson(request, 'scope'),
  ]);
  const [finance, sales, workflows, marketing, scope] = settled.map((s) => (s.status === 'fulfilled' ? s.value : null));

  const candidates: (DashboardAlert | null)[] = [];

  // ── Stripe auth ──────────────────────────────────────────────────────────────
  // finance returns { status: 'requires_reconnect' } on auth failures; it never
  // returns status: 'error' with an error_code. Pass hasError=true when status
  // is 'requires_reconnect' so the rule can fire. errorCode is null (the rule
  // treats null as a likely auth error).
  const financeStatus = (finance as { status?: string } | null)?.status;
  candidates.push(stripeAuthErrorRule({
    hasError: financeStatus === 'requires_reconnect',
    errorCode: null,
  }));

  // ── Elevated error rates ──────────────────────────────────────────────────────
  // Neither finance nor sales-live nor marketing expose an errors_24h field.
  // The rule threshold is > 5, so passing 0 means no alert fires — correct.
  for (const [tool, data] of [['Stripe', finance], ['HubSpot', sales], ['Apollo', marketing], ['Calendly', marketing]] as [string, unknown][]) {
    const errors24h = (data as { data?: { errors_24h?: number } } | null)?.data?.errors_24h ?? 0;
    candidates.push(elevatedErrorRateRule({ tool, errors24h }));
  }

  // ── Stuck deals ───────────────────────────────────────────────────────────────
  // sales-live / HubspotSalesData has no open_deals_detail[]. The loop will
  // iterate an empty array and no stuckDealRule alerts will fire.
  const deals = (sales as { data?: { open_deals_detail?: Array<{ name?: string; days_in_stage?: number; amount_usd?: number }> } } | null)?.data?.open_deals_detail ?? [];
  for (const d of deals) {
    if (!d.name || typeof d.days_in_stage !== 'number' || typeof d.amount_usd !== 'number') continue;
    candidates.push(stuckDealRule({ dealName: d.name, daysInStage: d.days_in_stage, valueUsd: d.amount_usd }));
  }

  // ── Failing workflows ─────────────────────────────────────────────────────────
  // workflow-health entries have no last_failure_at / last_recovery_at fields.
  // We derive them from recent_executions[]: the most-recent failure's started_at
  // is failedAt; if a success comes after that failure, the workflow recovered.
  type RecentExecution = {
    execution_id: string;
    status: 'success' | 'failure' | 'running' | 'canceled';
    started_at: string | null;
    duration_ms: number | null;
    error_summary: string | null;
  };
  type WorkflowEntry = {
    name?: string;
    recent_executions?: RecentExecution[];
  };

  const workflowsList = (workflows as { workflows?: WorkflowEntry[] } | null)?.workflows ?? [];
  const now = new Date();
  for (const w of workflowsList) {
    if (!w.name) continue;
    const execs = (w.recent_executions ?? []).filter((e) => e.started_at);
    // Sort descending so index 0 is the most recent
    execs.sort((a, b) => new Date(b.started_at!).getTime() - new Date(a.started_at!).getTime());

    // Find the most-recent failure
    const lastFailure = execs.find((e) => e.status === 'failure');
    if (!lastFailure?.started_at) continue;
    const failedAt = new Date(lastFailure.started_at);

    // Check if any success occurred after the failure (recovery)
    const recoveredAt = execs.find(
      (e) => e.status === 'success' && e.started_at && new Date(e.started_at) > failedAt,
    )?.started_at ?? null;

    candidates.push(failingWorkflowRule({
      workflowName: w.name,
      failedAt,
      recoveredAt: recoveredAt ? new Date(recoveredAt) : null,
      now,
    }));
  }

  // ── Empty calendar ────────────────────────────────────────────────────────────
  // marketing.data.meetings_booked is the actual field (no calendly sub-object).
  // sales-live.data.pipeline_value is the actual field (not pipeline_value_usd).
  const marketingData = (marketing as { status?: string; data?: { meetings_booked?: number | null } } | null);
  const salesData = (sales as { status?: string; data?: { pipeline_value?: number } } | null);

  const bookings7d = marketingData?.data?.meetings_booked ?? 0;
  const pipelineValueUsd = salesData?.data?.pipeline_value ?? 0;
  candidates.push(emptyCalendarRule({ bookings7d, pipelineValueUsd }));

  // ── Scope creep ───────────────────────────────────────────────────────────────
  type ScopeProject = {
    project_name?: string;
    burn_pct?: number;
  };
  const scopeProjects =
    (scope as { status?: string; data?: { projects?: ScopeProject[] } } | null)?.data?.projects ?? [];
  for (const p of scopeProjects) {
    if (!p.project_name || typeof p.burn_pct !== 'number') continue;
    candidates.push(scopeCreepRule({ projectName: p.project_name, burnPct: p.burn_pct }));
  }

  const alerts = sortAlertsBySeverity(
    candidates.filter((a): a is DashboardAlert => a !== null),
  ).slice(0, MAX_COCKPIT_ALERTS);

  const body: AlertsResponse = { status: 'ok', alerts };
  if (redis) await redis.set(key, body, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(body);
}
