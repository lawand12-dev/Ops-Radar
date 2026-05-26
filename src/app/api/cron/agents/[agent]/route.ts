/**
 * Dynamic cron endpoint for the 10-agent system.
 *
 * Vercel Cron hits `/api/cron/agents/<slug>` (GET) on the schedule defined in
 * `vercel.json`. For each request we:
 *   1. Verify the bearer token against `CRON_SECRET` (if set).
 *   2. Resolve the agent slug against the central registry.
 *   3. Find every user who currently has at least one active Nango
 *      connection — those are the only users who can actually run an agent.
 *   4. Filter out users who explicitly disabled this agent in `agent_config`
 *      (missing rows are treated as enabled by default).
 *   5. Invoke the shared agent runner (`runAgent`) sequentially for each user.
 *
 * Schedules live in each agent spec (`src/lib/agents/<slug>/index.ts`) and the
 * matching Vercel cron rows live in `vercel.json` at the repo root.
 */

import { AGENTS } from '<npm>/lib/agents/registry'
import { runAgent } from '<npm>/lib/agents/loop'
import type { AgentRunResult, AgentSlug } from '<npm>/lib/agents/types'
import {
  getServerSupabaseClient,
  hasServerSupabaseClient,
} from '<npm>/lib/supabase-server'
import { serverErrorResponse } from '<npm>/lib/security'
import { listAllConnections } from '<npm>/lib/nango/connections'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET

type RouteResult = {
  user_id: string
  status: AgentRunResult['status'] | 'error'
  reason?: string
  errorMessage?: string
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agent: string }> },
): Promise<Response> {
  // 1. Auth — only enforce when CRON_SECRET is configured. We still log a
  // warning so a misconfigured production deploy is obvious.
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    console.warn('[agents cron] CRON_SECRET not set — endpoint is unauthenticated')
  }

  // 2. Resolve agent slug
  const { agent } = await params
  const spec = AGENTS[agent as AgentSlug]
  if (!spec) {
    return Response.json({ error: `Unknown agent: ${agent}` }, { status: 404 })
  }

  if (!hasServerSupabaseClient()) return serverErrorResponse()
  const supabase = getServerSupabaseClient()

  // 3. Find every user with at least one active Nango connection. Without a
  // connection, the agent has no tools to call — skip those users entirely.
  const allConnections = await listAllConnections()
  const candidateUserIds = [
    ...new Set(allConnections.map((r) => r.user_id)),
  ]

  // 4. Filter by agent_config.is_enabled. Missing rows default to enabled.
  const { data: configRows, error: configErr } = await supabase
    .from('agent_config')
    .select('user_id, is_enabled')
    .eq('agent_slug', spec.slug)
    .in('user_id', candidateUserIds.length > 0 ? candidateUserIds : ['__none__'])

  if (configErr) {
    console.error('[agents cron] agent_config query failed', configErr)
    return serverErrorResponse()
  }

  const disabled = new Set(
    (configRows ?? [])
      .filter((r) => r.is_enabled === false)
      .map((r) => r.user_id),
  )

  const userIds = candidateUserIds.filter((id) => !disabled.has(id))

  // 5. Run sequentially. Parallelisation can come later once we trust the
  // per-user cost / rate-limit envelope.
  const results: RouteResult[] = []
  for (const userId of userIds) {
    try {
      const res = await runAgent(spec, userId)
      results.push({ user_id: userId, status: res.status, reason: res.reason })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[agents cron] runAgent threw for', userId, message)
      results.push({ user_id: userId, status: 'error', errorMessage: message })
    }
  }

  return Response.json({
    ok: true,
    agent: spec.slug,
    processed: results.length,
    results,
  })
}
