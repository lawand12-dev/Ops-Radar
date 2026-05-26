/**
 * Hourly outcome detection cron.
 *
 * For each user with at least one active Nango connection, run
 * `checkOutcomes(userId)` — which re-fetches every pending tracked entity, sees
 * whether the expected outcome has materialized (invoice paid, deal closed,
 * contract renewed, etc.), and flips `action_tracking.outcome_detected` for
 * the rows that match.
 *
 * Schedule: `0 * * * *` (hourly) — registered in vercel.json.
 * Auth:     Bearer token must match CRON_SECRET.
 */

import { checkOutcomes } from '<npm>/lib/actions/outcome-tracker'
import { hasServerSupabaseClient } from '<npm>/lib/supabase-server'
import { serverErrorResponse } from '<npm>/lib/security'
import { listAllConnections } from '<npm>/lib/nango/connections'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET

type PerUserResult = {
  user_id: string
  checked: number
  detected: number
  totalValueUsd: number
  error?: string
}

export async function GET(request: Request): Promise<Response> {
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    console.warn(
      '[check-outcomes cron] CRON_SECRET not set — endpoint is unauthenticated',
    )
  }

  if (!hasServerSupabaseClient()) return serverErrorResponse()

  // Only users with at least one live Nango connection are eligible — others
  // have nothing we can re-fetch.
  const allConnections = await listAllConnections()
  const userIds = [
    ...new Set(allConnections.map((r) => r.user_id)),
  ]

  const results: PerUserResult[] = []
  let totalChecked = 0
  let totalDetected = 0
  let totalValueUsd = 0

  for (const userId of userIds) {
    try {
      const res = await checkOutcomes(userId)
      totalChecked += res.checked
      totalDetected += res.detected
      totalValueUsd += res.totalValueUsd
      results.push({
        user_id: userId,
        checked: res.checked,
        detected: res.detected,
        totalValueUsd: res.totalValueUsd,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[check-outcomes cron] failed for', userId, message)
      results.push({
        user_id: userId,
        checked: 0,
        detected: 0,
        totalValueUsd: 0,
        error: message,
      })
    }
  }

  console.log('[check-outcomes cron] done', {
    users: userIds.length,
    totalChecked,
    totalDetected,
    totalValueUsd,
  })

  return Response.json({
    ok: true,
    users: userIds.length,
    totalChecked,
    totalDetected,
    totalValueUsd: Math.round(totalValueUsd * 100) / 100,
    results,
  })
}
