import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { isComposioConnected } from '<npm>/lib/composio-fetch'
import { applyRateLimit } from '<npm>/lib/rate-limit'
import { computeAgencyScore } from '<npm>/lib/agency-score'
import { bucketForTeamSize } from '<npm>/lib/benchmarks/buckets'
import type { BenchmarkRow } from '<npm>/lib/benchmarks/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await applyRateLimit(request, 'dashboard-score', userId)
  if (limited) return limited as NextResponse

  const service = getServerSupabaseClient()
  const { data: { user }, error: userErr } = await service.auth.admin.getUserById(userId)
  if (userErr || !user) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
    ? meta.blended_hourly_rate_usd
    : 85
  const companyName = typeof meta.company_name === 'string' ? meta.company_name : ''
  const teamSizeRaw = typeof meta.team_size === 'string' ? meta.team_size : ''

  const bucket = bucketForTeamSize(teamSizeRaw)
  const session = await getSessionSupabaseClient()

  const [benchmarkResult, stripeConnected, harvestConnected] = await Promise.all([
    bucket
      ? session.from('benchmarks').select('*').eq('team_size_bucket', bucket)
      : Promise.resolve({ data: [] }),
    isComposioConnected(userId, 'stripe'),
    isComposioConnected(userId, 'harvest'),
  ])

  const score = await computeAgencyScore({
    userId,
    stripeConnected,
    harvestConnected,
    blendedRate,
    teamSizeRaw,
    companyName,
    benchmarkRows: (benchmarkResult.data ?? []) as BenchmarkRow[],
  })

  return NextResponse.json({ score })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await applyRateLimit(request, 'dashboard-score', userId)
  if (limited) return limited as NextResponse

  const service = getServerSupabaseClient()
  const { data: { user }, error: userErr } = await service.auth.admin.getUserById(userId)
  if (userErr || !user) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
    ? meta.blended_hourly_rate_usd
    : 85
  const companyName = typeof meta.company_name === 'string' ? meta.company_name : ''
  const teamSizeRaw = typeof meta.team_size === 'string' ? meta.team_size : ''
  const bucket = bucketForTeamSize(teamSizeRaw)

  const session = await getSessionSupabaseClient()

  const [benchmarkResult, stripeConnected, harvestConnected] = await Promise.all([
    bucket
      ? session.from('benchmarks').select('*').eq('team_size_bucket', bucket)
      : Promise.resolve({ data: [] }),
    isComposioConnected(userId, 'stripe'),
    isComposioConnected(userId, 'harvest'),
  ])

  const score = await computeAgencyScore({
    userId,
    stripeConnected,
    harvestConnected,
    blendedRate,
    teamSizeRaw,
    companyName,
    benchmarkRows: (benchmarkResult.data ?? []) as BenchmarkRow[],
  })

  const { data: snapshot, error: snapshotErr } = await session
    .from('score_snapshots')
    .insert({
      user_id: userId,
      company_name: companyName,
      scores: score as unknown as import('<npm>/lib/database.types').Json,
    })
    .select('share_token')
    .single()

  if (snapshotErr || !snapshot) {
    console.error('[score] snapshot insert failed:', snapshotErr)
    return NextResponse.json({ error: 'snapshot_failed' }, { status: 500 })
  }

  return NextResponse.json({ share_token: snapshot.share_token, score })
}
