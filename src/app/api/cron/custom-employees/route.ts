/**
 * Cron dispatcher for custom AI employees (CP-34).
 *
 * Vercel Cron hits `/api/cron/custom-employees` daily (see vercel.json).
 * For each tick we:
 *   1. Verify the bearer token against CRON_SECRET.
 *   2. Load every active custom_employees row across all users with a non-null
 *      schedule_cron.
 *   3. For each, decide whether the cron expression is "due now" within the
 *      current hour window.
 *   4. For due employees, invoke the shared `runAgent` runner with a
 *      synthesized AgentSpec built from the employee's runtime fields.
 *
 * Why one shared endpoint (not one per employee):
 *   - Customer-defined schedules can't be statically registered in vercel.json.
 *   - The 28 built-in agents keep their per-slug Vercel cron rows; this route
 *     only handles the dynamic custom layer.
 *
 * Vercel Hobby plan limits cron to once-daily frequency, so this endpoint
 * fires once and matches the customer's chosen *hour* against "now's hour".
 * Per-minute precision is a Pro-tier upgrade (move to an external scheduler).
 */

import type { AgentSpec, AgentSlug } from '<npm>/lib/agents/types'
import type { ToolSlug } from '<npm>/lib/composio'
import { runAgent } from '<npm>/lib/agents/loop'
import {
  getServerSupabaseClient,
  hasServerSupabaseClient,
} from '<npm>/lib/supabase-server'
import { serverErrorResponse } from '<npm>/lib/security'
import type { Database } from '<npm>/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CRON_SECRET = process.env.CRON_SECRET

type CustomEmployeeRow = Database['public']['Tables']['custom_employees']['Row']

type DispatchResult = {
  employee_slug: string
  user_id: string
  status: 'success' | 'failed' | 'skipped' | 'not-due'
  reason?: string
}

// Returns true if the cron expression's hour field matches the current UTC
// hour. We only check hour-level granularity because Vercel Hobby cron fires
// daily. Supported cron forms (forward-slash + asterisk avoided in jsdoc):
//   - "0 8 . . ."       08:xx UTC daily
//   - "0 8,14 . . ."    8am and 2pm
//   - "0 8 . . 1"       Monday 8am
//   - step intervals    e.g. star-slash-4 means every 4 units
//
// Returns true if today + this hour falls within the cron's hour set AND the
// day-of-week (or day-of-month) constraint matches.
function isCronDueThisHour(cronExpr: string, now: Date = new Date()): boolean {
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length !== 5) return false
  const [, hourField, domField, , dowField] = parts

  const currentHour = now.getUTCHours()
  const currentDom = now.getUTCDate()
  const currentDow = now.getUTCDay() // 0 = Sunday

  if (!matchesField(hourField, currentHour, 0, 23)) return false
  if (!matchesField(domField, currentDom, 1, 31)) return false
  if (!matchesField(dowField, currentDow, 0, 6)) return false
  return true
}

function matchesField(field: string, value: number, min: number, max: number): boolean {
  if (field === '*') return true
  // step: */N (every Nth)
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10)
    if (!Number.isFinite(step) || step <= 0) return false
    return (value - min) % step === 0
  }
  // list: 1,3,5
  if (field.includes(',')) {
    return field.split(',').some((p) => matchesField(p, value, min, max))
  }
  // range: 1-5
  if (field.includes('-')) {
    const [lo, hi] = field.split('-').map((s) => parseInt(s, 10))
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return false
    return value >= lo && value <= hi
  }
  // single number
  const n = parseInt(field, 10)
  return Number.isFinite(n) && n === value
}

/**
 * Synthesize an AgentSpec from a custom_employees row so we can call
 * the shared `runAgent` loop. The slug is namespaced with `custom:` to
 * keep brain commits and agent_runs distinguishable from built-in agents.
 */
function specFromCustomEmployee(row: CustomEmployeeRow): AgentSpec {
  return {
    slug: `custom:${row.slug}` as AgentSlug, // cast — runAgent only uses this as a string
    displayName: `${row.name} · ${row.role}`,
    description: row.persona_summary?.slice(0, 200) ?? `${row.role} (custom employee)`,
    model: (row.model_slug ?? 'gpt-5.4') as AgentSpec['model'],
    composioApps: row.scoped_toolkits as ToolSlug[],
    requiredTier: 'starter',
    requiredIntegrations: [], // soft requirements — let the agent see what's available
    cronSchedule: row.schedule_cron ?? '0 0 * * *',
    maxSteps: row.max_steps,
    systemPrompt: row.system_prompt,
  }
}

export async function GET(request: Request): Promise<Response> {
  // 1. Auth
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    console.warn('[custom-employees cron] CRON_SECRET not set — endpoint is unauthenticated')
  }

  if (!hasServerSupabaseClient()) return serverErrorResponse()
  const supabase = getServerSupabaseClient()

  // 2. Load all schedulable custom employees across all users.
  const { data, error } = await supabase
    .from('custom_employees')
    .select('*')
    .eq('status', 'active')
    .not('schedule_cron', 'is', null)
    .order('user_id', { ascending: true })

  if (error) {
    console.error('[custom-employees cron] load failed', error)
    return serverErrorResponse()
  }

  const rows = (data ?? []) as CustomEmployeeRow[]
  const now = new Date()
  const results: DispatchResult[] = []

  // 3. Filter to "due this hour" and 4. run sequentially per row.
  // We run sequentially (not parallel) to bound concurrency per Vercel function
  // execution. A future improvement: bucket by user_id and run users in parallel,
  // employees per user sequentially.
  for (const row of rows) {
    if (!row.schedule_cron) continue
    if (!isCronDueThisHour(row.schedule_cron, now)) {
      results.push({
        employee_slug: row.slug,
        user_id: row.user_id,
        status: 'not-due',
      })
      continue
    }

    try {
      const spec = specFromCustomEmployee(row)
      const result = await runAgent(spec, row.user_id)
      results.push({
        employee_slug: row.slug,
        user_id: row.user_id,
        status: result.status,
        reason: result.reason,
      })

      // Touch last_run_at on success so the UI can show "ran 2h ago".
      if (result.status === 'success') {
        await supabase
          .from('custom_employees')
          .update({ last_run_at: new Date().toISOString() })
          .eq('id', row.id)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[custom-employees cron] run failed', row.slug, message)
      results.push({
        employee_slug: row.slug,
        user_id: row.user_id,
        status: 'failed',
        reason: message,
      })
    }
  }

  return Response.json({
    timestamp: now.toISOString(),
    scanned: rows.length,
    fired: results.filter((r) => r.status !== 'not-due').length,
    results,
  })
}
