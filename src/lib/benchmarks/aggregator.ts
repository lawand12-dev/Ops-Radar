import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { listAllConnections } from '<npm>/lib/nango/connections'
import { bucketForServiceMix, bucketForTeamSize } from './buckets'
import { collectUserMetrics, type UserMetrics } from './collect'
import { p25, p50, p75 } from './percentile'
import {
  SERVICE_MIX_BUCKETS,
  TEAM_SIZE_BUCKETS,
  type BenchmarkMetric,
  type ServiceMixBucket,
  type TeamSizeBucket,
} from './types'

const SAMPLE_SIZE_FLOOR = 5
const ALL_METRICS: BenchmarkMetric[] = [
  'median_client_margin_pct',
  'median_invoice_days_overdue',
  'hours_per_10k_revenue',
  'active_client_count',
]

export type AggregateStats = {
  users_considered: number
  users_with_data:  number
  rows_upserted:    number
}

type SampleKey = `${TeamSizeBucket}|${ServiceMixBucket}`
const key = (team: TeamSizeBucket, mix: ServiceMixBucket): SampleKey => `${team}|${mix}` as SampleKey

export async function runBenchmarkAggregation(): Promise<AggregateStats> {
  const supabase = getServerSupabaseClient()

  // Find users with any active Nango connection — these are the
  // candidates whose metrics can be sampled into benchmark cohorts.
  const allConnections = await listAllConnections()
  const connectionsByUser = new Map<string, Set<string>>()
  for (const row of allConnections) {
    const set = connectionsByUser.get(row.user_id) ?? new Set<string>()
    set.add(row.tool_slug)
    connectionsByUser.set(row.user_id, set)
  }
  const userIds = [...connectionsByUser.keys()]

  // Sample sets keyed by (team_size, service_mix).
  // We always also accumulate into (team_size, 'all') to keep the pooled cohort.
  const samples = new Map<SampleKey, Map<BenchmarkMetric, number[]>>()
  const ensureBucket = (k: SampleKey) => {
    if (!samples.has(k)) {
      const inner = new Map<BenchmarkMetric, number[]>()
      for (const m of ALL_METRICS) inner.set(m, [])
      samples.set(k, inner)
    }
    return samples.get(k)!
  }

  let withData = 0

  for (const userId of userIds) {
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    if (!user) continue
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    if (meta.benchmark_opt_in === false) continue

    const teamBucket = bucketForTeamSize(meta.team_size as string | undefined)
    if (!teamBucket) continue

    const mixBucket = bucketForServiceMix(meta.service_mix as string | undefined) ?? null

    const userConnections = connectionsByUser.get(userId) ?? new Set<string>()

    let metrics: UserMetrics
    try {
      metrics = await collectUserMetrics({
        userId,
        stripeConnected:  userConnections.has('stripe'),
        harvestConnected: userConnections.has('harvest'),
        blendedRate:      typeof meta.blended_hourly_rate_usd === 'number'
          ? meta.blended_hourly_rate_usd
          : null,
      })
    } catch (err) {
      console.warn('[benchmarks] collect failed for user', userId, err)
      continue
    }

    if (Object.keys(metrics).length === 0) continue
    withData += 1

    // Always contribute to the pooled (team_size, 'all') cohort.
    const pooled = ensureBucket(key(teamBucket, 'all'))
    // Also contribute to the service-mix-specific cohort if the user declared one.
    const specific = mixBucket ? ensureBucket(key(teamBucket, mixBucket)) : null

    for (const [metricKey, value] of Object.entries(metrics) as [BenchmarkMetric, number][]) {
      if (!Number.isFinite(value)) continue
      pooled.get(metricKey)!.push(value)
      if (specific) specific.get(metricKey)!.push(value)
    }
  }

  const computedAt = new Date().toISOString()
  let rowsUpserted = 0

  for (const team of TEAM_SIZE_BUCKETS) {
    for (const mix of SERVICE_MIX_BUCKETS) {
      const inner = samples.get(key(team, mix))
      if (!inner) continue
      for (const metric of ALL_METRICS) {
        const arr = inner.get(metric)!
        if (arr.length < SAMPLE_SIZE_FLOOR) continue
        const v25 = p25(arr); const v50 = p50(arr); const v75 = p75(arr)
        if (v25 === null || v50 === null || v75 === null) continue

        const { error } = await supabase
          .from('benchmarks')
          .upsert(
            {
              metric,
              team_size_bucket: team,
              service_mix_bucket: mix,
              p25: v25,
              p50: v50,
              p75: v75,
              sample_size: arr.length,
              computed_at: computedAt,
            },
            { onConflict: 'metric,team_size_bucket,service_mix_bucket' },
          )
        if (!error) rowsUpserted += 1
        else console.error('[benchmarks] upsert failed', { metric, team, mix, error })
      }
    }
  }

  return {
    users_considered: userIds.length,
    users_with_data:  withData,
    rows_upserted:    rowsUpserted,
  }
}
