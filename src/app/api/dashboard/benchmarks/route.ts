import { NextResponse } from 'next/server'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { decryptApiKey } from '<npm>/lib/integrations/crypto'
import { bucketForTeamSize } from '<npm>/lib/benchmarks/buckets'
import { collectUserMetrics } from '<npm>/lib/benchmarks/collect'
import {
  METRIC_DIRECTION,
  type BenchmarkMetric,
  type BenchmarkRow,
  type UserComparison,
} from '<npm>/lib/benchmarks/types'

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
  const bucket = bucketForTeamSize(meta.team_size as string | undefined)

  if (!bucket) {
    return NextResponse.json({
      bucket: null,
      comparisons: [] as UserComparison[],
    })
  }

  const session = await getSessionSupabaseClient()
  const { data: rows } = await session
    .from('benchmarks')
    .select('*')
    .eq('team_size_bucket', bucket)

  const benchmarkByMetric = new Map<BenchmarkMetric, BenchmarkRow>()
  for (const r of rows ?? []) {
    benchmarkByMetric.set(r.metric as BenchmarkMetric, r as BenchmarkRow)
  }

  const { data: keyRows } = await service
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('status', 'connected')

  const getKey = (tool: string): string | null => {
    const row = (keyRows ?? []).find((r) => r.tool === tool)
    try { return row ? decryptApiKey(row) : null } catch { return null }
  }

  const metrics = await collectUserMetrics({
    stripeApiKey:  getKey('stripe'),
    harvestApiKey: getKey('harvest'),
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

  return NextResponse.json({ bucket, comparisons })
}
