import { type NextRequest } from 'next/server'
import {
  getAdminSessionTokenFromCookieHeader,
  isValidAdminSessionToken,
} from '../../../../lib/admin-session'
import { applyRateLimit } from '../../../../lib/rate-limit'
import { serverErrorResponse } from '../../../../lib/security'
import { hasServerSupabaseClient } from '../../../../lib/supabase-server'

const STEP_LABELS: Record<number, string> = {
  0: 'Agency type',
  1: 'Team size',
  2: 'Revenue',
  3: 'Active clients',
  4: 'Services',
  5: 'Tools',
  6: 'Email gate',
  7: 'Hours lost',
  8: 'Breakage response',
  9: 'Top pain',
  10: 'Frequency',
  11: 'Six-month cost',
  12: 'Two-week change',
}

const TOTAL_STEPS = 13

const JSON_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
}

function requireAdminSession(request: Request): Response | null {
  const sessionToken = getAdminSessionTokenFromCookieHeader(
    request.headers.get('cookie') ?? '',
  )

  if (!isValidAdminSessionToken(sessionToken)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: JSON_HEADERS })
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(request, 'admin-data')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const authResponse = requireAdminSession(request)
    if (authResponse) {
      return authResponse
    }

    if (!hasServerSupabaseClient()) {
      return Response.json({ funnel: [], totalSessions: 0 }, { headers: JSON_HEADERS })
    }

    // CP-16 retired the audit_sessions table — the funnel always reports
    // zero now. Kept the route so the admin page doesn't 404; safe to remove
    // entirely once the admin UI is updated.
    const sessions: Array<{ step_reached: number | null }> = []
    const totalSessions = sessions.length

    const funnel = Array.from({ length: TOTAL_STEPS }, (_, step) => {
      const reachedCount = (sessions ?? []).filter((s) => (s.step_reached ?? 0) >= step).length
      const percent = totalSessions > 0 ? Math.round((reachedCount / totalSessions) * 100) : 0
      return {
        step,
        label: STEP_LABELS[step] ?? `Step ${step}`,
        reached: reachedCount,
        percent,
      }
    })

    let biggestDropStep = 0
    let biggestDropPct = 0
    for (let i = 1; i < funnel.length; i++) {
      const drop = funnel[i - 1].percent - funnel[i].percent
      if (drop > biggestDropPct) {
        biggestDropPct = drop
        biggestDropStep = i
      }
    }

    return Response.json(
      {
        funnel,
        totalSessions,
        biggestDropStep,
        biggestDropPct,
        completionRate: funnel[TOTAL_STEPS - 1]?.percent ?? 0,
      },
      { headers: JSON_HEADERS },
    )
  } catch (err) {
    console.error('[admin/funnel] error:', err)
    return serverErrorResponse()
  }
}
