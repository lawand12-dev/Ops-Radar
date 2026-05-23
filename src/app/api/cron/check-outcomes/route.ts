/**
 * Hourly outcome detection cron.
 *
 * For each user with at least one active Composio connection, run
 * `checkOutcomes(userId)` — which re-fetches every pending tracked entity, sees
 * whether the expected outcome has materialized (invoice paid, deal closed,
 * contract renewed, etc.), and flips `action_tracking.outcome_detected` for
 * the rows that match.
 *
 * Schedule: `0 * * * *` (hourly) — registered in vercel.json.
 * Auth:     Bearer token must match CRON_SECRET.
 */

import { checkOutcomes } from '<npm>/lib/actions/outcome-tracker'
import {
  getServerSupabaseClient,
  hasServerSupabaseClient,
} from '<npm>/lib/supabase-server'
import { serverErrorResponse } from '<npm>/lib/security'

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
  const supabase = getServerSupabaseClient()

  // Only users with at least one live Composio connection are eligible — others
  // have nothing we can re-fetch.
  const { data: rows, error } = await supabase
    .from('composio_connections')
    .select('user_id')
    .eq('is_active', true)

  if (error) {
    console.error('[check-outcomes cron] composio_connections query failed', error)
    return serverErrorResponse()
  }

  const userIds = [
    ...new Set((rows ?? []).map((r) => r.user_id).filter(Boolean)),
  ] as string[]

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
