// CP-33 — Agent activity summary for the Overview page.
//
// Returns counts of agent runs in the last 24h, broken down by status.
// Used by the Overview block: "47 runs today · 2 failures · View runs →"
//
// Cheap parallel COUNT queries; no row data shipped to the client.

import { NextResponse } from 'next/server'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = await getSessionSupabaseClient()
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const baseQuery = () =>
    supabase
      .from('agent_runs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('started_at', sinceIso)

  const [totalRes, failedRes, runningRes] = await Promise.all([
    baseQuery(),
    baseQuery().eq('status', 'failed'),
    baseQuery().eq('status', 'running'),
  ])

  return NextResponse.json({
    total_24h: totalRes.count ?? 0,
    failed_24h: failedRes.count ?? 0,
    running_24h: runningRes.count ?? 0,
  })
}
