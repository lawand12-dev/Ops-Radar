import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { applyRateLimit } from '<npm>/lib/rate-limit'
import {
  readRecentKpiSnapshots,
  tryReadNotion,
  type KpiSnapshot,
} from '<npm>/lib/notion/helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CACHE_TTL_SECONDS = 30 * 60
const CACHE_KEY = (userId: string) => `dash:kpi-trends:${userId}`

type SparklinePoint = { week_ending: string; value: number }

type KpiTrendsOkData = {
  weeks: number
  latest: {
    week_ending: string
    mrr: number
    cash_collected_mtd: number
    overdue_invoices_30d: number
    active_clients: number
    avg_margin_pct: number
    team_utilization_pct: number
    pipeline_value: number
  }
  deltas: {
    mrr_change_pct: number | null
    cash_change_pct: number | null
    margin_change_pp: number | null
    utilization_change_pp: number | null
    pipeline_change_pct: number | null
  }
  sparkline: {
    mrr: SparklinePoint[]
    cash: SparklinePoint[]
    margin: SparklinePoint[]
    utilization: SparklinePoint[]
  }
  latest_agent_summary: string
}

type KpiTrendsResponse =
  | {
      status: 'ok'
      data: KpiTrendsOkData
      last_synced_at: string
      from_cache: boolean
    }
  | { status: 'not_connected' }
  | { status: 'no_data'; message: string }
  | { status: 'unavailable'; message: string }

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Percent change, rounded to 1 decimal. Returns null if prior is 0 (or NaN). */
function pctChange(latest: number, prior: number): number | null {
  if (!Number.isFinite(prior) || prior === 0) return null
  if (!Number.isFinite(latest)) return null
  return round1(((latest - prior) / prior) * 100)
}

/** Percentage-point delta, rounded to 1 decimal. */
function ppDelta(latest: number, prior: number): number | null {
  if (!Number.isFinite(latest) || !Number.isFinite(prior)) return null
  return round1(latest - prior)
}

function shapeTrends(snapshots: KpiSnapshot[]): KpiTrendsOkData {
  // Caller guarantees snapshots.length >= 1.
  // Sort ascending by weekEnding for sparkline (oldest → newest).
  const ascending = [...snapshots].sort((a, b) =>
    a.weekEnding < b.weekEnding ? -1 : a.weekEnding > b.weekEnding ? 1 : 0,
  )
  // Latest = last of ascending; prior = second-to-last.
  const latest = ascending[ascending.length - 1]
  const prior = ascending.length >= 2 ? ascending[ascending.length - 2] : null

  const deltas = prior
    ? {
        mrr_change_pct: pctChange(latest.mrr, prior.mrr),
        cash_change_pct: pctChange(latest.cashCollectedMtd, prior.cashCollectedMtd),
        margin_change_pp: ppDelta(latest.avgMarginPct, prior.avgMarginPct),
        utilization_change_pp: ppDelta(
          latest.teamUtilizationPct,
          prior.teamUtilizationPct,
        ),
        pipeline_change_pct: pctChange(latest.pipelineValue, prior.pipelineValue),
      }
    : {
        mrr_change_pct: null,
        cash_change_pct: null,
        margin_change_pp: null,
        utilization_change_pp: null,
        pipeline_change_pct: null,
      }

  const sparkline = {
    mrr: ascending.map((s) => ({ week_ending: s.weekEnding, value: s.mrr })),
    cash: ascending.map((s) => ({
      week_ending: s.weekEnding,
      value: s.cashCollectedMtd,
    })),
    margin: ascending.map((s) => ({
      week_ending: s.weekEnding,
      value: s.avgMarginPct,
    })),
    utilization: ascending.map((s) => ({
      week_ending: s.weekEnding,
      value: s.teamUtilizationPct,
    })),
  }

  return {
    weeks: ascending.length,
    latest: {
      week_ending: latest.weekEnding,
      mrr: latest.mrr,
      cash_collected_mtd: latest.cashCollectedMtd,
      overdue_invoices_30d: latest.overdueInvoices30d,
      active_clients: latest.activeClients,
      avg_margin_pct: latest.avgMarginPct,
      team_utilization_pct: latest.teamUtilizationPct,
      pipeline_value: latest.pipelineValue,
    },
    deltas,
    sparkline,
    latest_agent_summary: latest.agentSummary,
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<KpiTrendsResponse>> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { status: 'unavailable', message: 'unauthorized' },
      { status: 401 },
    )
  }

  // Rate limit (per-user). The 'dashboard-kpi-trends' name isn't in the central
  // limiter map yet; cast is intentional and isolated to this widget — the
  // limiter falls back to its "name not configured" path safely (fail-open for
  // a read-only widget).
  const limited = await applyRateLimit(
    request,
    'dashboard-kpi-trends' as Parameters<typeof applyRateLimit>[1],
    userId,
  )
  if (limited) {
    return limited as NextResponse<KpiTrendsResponse>
  }

  const redis = (() => {
    try {
      return Redis.fromEnv()
    } catch {
      return null
    }
  })()

  if (redis) {
    const cached = await redis.get<KpiTrendsResponse>(CACHE_KEY(userId))
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true })
    }
  }

  let snapshots: KpiSnapshot[] | null
  try {
    snapshots = await tryReadNotion(() => readRecentKpiSnapshots(userId, 12))
  } catch (err) {
    console.error('[kpi-trends] notion read failed:', err)
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    })
  }

  // No Notion workspace provisioned for this user.
  if (snapshots === null) {
    return NextResponse.json({ status: 'not_connected' })
  }

  // Notion connected but the Revenue Agent hasn't written any snapshots yet.
  if (snapshots.length === 0) {
    return NextResponse.json({
      status: 'no_data',
      message:
        'The Revenue Agent has not written any KPI snapshots yet. Snapshots are created weekly on Mondays.',
    })
  }

  const data = shapeTrends(snapshots)
  const payload: KpiTrendsResponse = {
    status: 'ok',
    data,
    last_synced_at: new Date().toISOString(),
    from_cache: false,
  }

  if (redis) {
    try {
      await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS })
    } catch (err) {
      // Cache write is best-effort — never fail the request on a Redis hiccup.
      console.warn('[kpi-trends] cache write failed:', err)
    }
  }

  return NextResponse.json(payload)
}
