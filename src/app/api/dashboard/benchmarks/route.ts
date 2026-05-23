import { NextResponse } from 'next/server'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { isComposioConnected } from '<npm>/lib/composio-fetch'
import { bucketForServiceMix, bucketForTeamSize } from '<npm>/lib/benchmarks/buckets'
import { collectUserMetrics } from '<npm>/lib/benchmarks/collect'
import {
  METRIC_DIRECTION,
  type BenchmarkMetric,
  type BenchmarkRow,
  type ServiceMixBucket,
  type UserComparison,
} from '<npm>/lib/benchmarks/types'
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function classify(
  metric: BenchmarkMetric,
  userValue: number | null,
  row: BenchmarkRow | null,
): UserComparison['position'] {
  if (userValue === null || row === null) return 'no_data'
  const dir = METRIC_DIRECTION[metric]
  if (dir === 'neutral') {
    if (userValue >= row.p75) return 'above'
    if (userValue <= row.p25) return 'below'
    return userValue >= row.p50 ? 'above' : 'below'
  }
  if (dir === 'higher_better') {
    if (userValue >= row.p75) return 'top_25'
    if (userValue >= row.p50) return 'above'
    if (userValue >= row.p25) return 'below'
    return 'bottom_25'
  }
  if (userValue <= row.p25) return 'top_25'
  if (userValue <= row.p50) return 'above'
  if (userValue <= row.p75) return 'below'
  return 'bottom_25'
}

export async function GET(): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const service = getServerSupabaseClient()
  const { data: { user }, error: userErr } = await service.auth.admin.getUserById(userId)
  if (userErr || !user) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>

  const plan = getUserPlan(meta)
  if (!canAccess(plan, 'benchmarks')) {
    return NextResponse.json(upgradeRequiredBody('growth'), { status: 402 })
  }

  const bucket = bucketForTeamSize(meta.team_size as string | undefined)
  const userMix = bucketForServiceMix(meta.service_mix as string | undefined)

  if (!bucket) {
    return NextResponse.json({
      bucket: null,
      service_mix: userMix,
      comparisons: [] as UserComparison[],
    })
  }

  const session = await getSessionSupabaseClient()
  // Fetch BOTH the user's service-mix-specific cohort AND the pooled cohort.
  // We prefer the specific cohort per-metric when it has sample_size >= floor,
  // otherwise fall back to the pooled 'all' cohort.
  const cohortsToQuery: ServiceMixBucket[] = userMix && userMix !== 'all' ? [userMix, 'all'] : ['all']
  const { data: rows } = await session
    .from('benchmarks')
    .select('*')
    .eq('team_size_bucket', bucket)
    .in('service_mix_bucket', cohortsToQuery)

  // Build a lookup preferring the more specific cohort.
  const benchmarkByMetric = new Map<BenchmarkMetric, BenchmarkRow>()
  for (const r of rows ?? []) {
    const row = r as BenchmarkRow
    const existing = benchmarkByMetric.get(row.metric)
    // Prefer the user's specific mix; fall back to 'all' if no specific row.
    if (!existing || (existing.service_mix_bucket === 'all' && row.service_mix_bucket !== 'all')) {
      benchmarkByMetric.set(row.metric, row)
    }
  }

  const [stripeConnected, harvestConnected] = await Promise.all([
    isComposioConnected(userId, 'stripe'),
    isComposioConnected(userId, 'harvest'),
  ])

  const metrics = await collectUserMetrics({
    userId,
    stripeConnected,
    harvestConnected,
    blendedRate:   typeof meta.blended_hourly_rate_usd === 'number'
      ? meta.blended_hourly_rate_usd
      : null,
  })

  const allMetrics: BenchmarkMetric[] = [
    'median_client_margin_pct',
    'median_invoice_days_overdue',
    'hours_per_10k_revenue',
    'active_client_count',
  ]

  const comparisons: UserComparison[] = allMetrics.map((metric) => {
    const userValue = metrics[metric] ?? null
    const benchmark = benchmarkByMetric.get(metric) ?? null
    return {
      metric,
      user_value: userValue,
      bucket,
      benchmark,
      position: classify(metric, userValue, benchmark),
    }
  })

  return NextResponse.json({ bucket, service_mix: userMix, comparisons })
}
