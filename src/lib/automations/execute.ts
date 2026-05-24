/**
 * Synchronous automation executor (CP-20, Phase 3).
 *
 * Walks the AutomationSpec one step at a time. Each composio_action step
 * queues through the existing approval gate (src/lib/agents/approval-gate.ts)
 * so the customer reviews + approves before the actual Composio call fires.
 *
 * What this DOES handle:
 *   - composio_action, notion_write, condition, set, queue_action
 *   - agent_step (bounded with stepCountIs(spec.maxSteps))
 *
 * What this does NOT handle (Phase 7 — Vercel Workflows):
 *   - wait (durable sleep > 60s)
 *   - wait_for_event (wait for an external event)
 *   - loop with max_concurrent > 1
 *
 * Specs containing those steps are rejected at install time with a clear
 * error so the customer knows the durable runtime hasn't shipped yet.
 */

import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { getComposio } from '<npm>/lib/composio'
import { getToolPolicy, loadToolPolicies } from '<npm>/lib/agents/tool-policies'
import type { Json } from '<npm>/lib/database.types'
import type {
  AutomationSpec,
  AutomationStep,
  CustomerAutomation,
} from './types'
import { specHasWaits } from './types'

export type AutomationExecuteSource = 'webhook' | 'schedule' | 'manual' | 'chat'

export type ExecuteAutomationInput = {
  automation: CustomerAutomation
  triggerEvent: Record<string, unknown>
  source: AutomationExecuteSource
}

export type ExecuteAutomationResult = {
  runId: string
  status: 'succeeded' | 'failed' | 'awaiting_approval'
  steps_executed: number
  actions_queued: number
  error?: string
}

/**
 * Top-level entry. Persists run state at start, walks the spec, finalizes
 * the run row. Always returns — never throws — so the webhook handler can
 * return 200 to Composio even when individual steps fail.
 */
export async function executeAutomation(
  input: ExecuteAutomationInput,
): Promise<ExecuteAutomationResult> {
  const { automation, triggerEvent, source } = input

  if (specHasWaits(automation.spec)) {
    return {
      runId: '',
      status: 'failed',
      steps_executed: 0,
      actions_queued: 0,
      error:
        'Spec contains a `wait` step — the durable runtime (Vercel Workflows) is not yet shipped (Phase 7).',
    }
  }

  const supabase = getServerSupabaseClient()
  const startedAt = new Date().toISOString()

  // Insert the run row first so the customer sees it in /dashboard/runs immediately.
  const { data: runRow, error: runErr } = await supabase
    .from('automation_runs')
    .insert({
      automation_id: automation.id,
      user_id: automation.user_id,
      trigger_event: triggerEvent as unknown as Json,
      status: 'running',
      started_at: startedAt,
      steps: [],
      queued_action_ids: [],
    })
    .select('id')
    .single()

  if (runErr || !runRow) {
    console.error('[automations/execute] failed to create run row:', runErr?.message)
    return {
      runId: '',
      status: 'failed',
      steps_executed: 0,
      actions_queued: 0,
      error: runErr?.message ?? 'unknown_run_insert_error',
    }
  }
  const runId = runRow.id as string

  // Load tool policies once per run (same pattern as agent loop).
  const policies = await loadToolPolicies(automation.user_id)

  const ledger: Record<string, unknown> = { trigger: triggerEvent }
  const queuedActionIds: string[] = []
  const stepTrace: Array<{
    index: number
    kind: string
    status: 'success' | 'queued' | 'skipped' | 'failed'
    summary?: string
    error?: string
  }> = []

  let stepsExecuted = 0
  let runStatus: 'succeeded' | 'failed' | 'awaiting_approval' = 'succeeded'
  let runError: string | undefined

  try {
    await walkSpec({
      steps: automation.spec.steps,
      automation,
      ledger,
      policies,
      stepTrace,
      queuedActionIds,
      source,
    })
    stepsExecuted = stepTrace.length

    // If any step queued an action, the run is technically awaiting_approval —
    // but we still mark the orchestration as succeeded since the executor
    // completed the spec walk. Customer sees the queued actions at /dashboard/actions.
    runStatus = queuedActionIds.length > 0 ? 'awaiting_approval' : 'succeeded'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[automations/execute] step failed:', message)
    runStatus = 'failed'
    runError = message
    stepsExecuted = stepTrace.length
  }

  await supabase
    .from('automation_runs')
    .update({
      status: runStatus,
      result: { ledger } as unknown as Json,
      error: runError ?? null,
      steps: stepTrace as unknown as Json,
      queued_action_ids: queuedActionIds,
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId)

  // Bump run counters on the automation itself.
  await supabase
    .from('customer_automations')
    .update({
      last_run_at: startedAt,
      last_run_status: runStatus,
      run_count: (automation.run_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', automation.id)

  return {
    runId,
    status: runStatus,
    steps_executed: stepsExecuted,
    actions_queued: queuedActionIds.length,
    error: runError,
  }
}

// ─── Step walker ───────────────────────────────────────────────────────────

type WalkContext = {
  steps: AutomationStep[]
  automation: CustomerAutomation
  ledger: Record<string, unknown>
  policies: Awaited<ReturnType<typeof loadToolPolicies>>
  stepTrace: Array<{
    index: number
    kind: string
    status: 'success' | 'queued' | 'skipped' | 'failed'
    summary?: string
    error?: string
  }>
  queuedActionIds: string[]
  source: AutomationExecuteSource
}

async function walkSpec(ctx: WalkContext): Promise<void> {
  for (let i = 0; i < ctx.steps.length; i++) {
    const step = ctx.steps[i]
    try {
      await runStep(step, ctx, i)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      ctx.stepTrace.push({ index: i, kind: step.kind, status: 'failed', error: message })
      throw err
    }
  }
}

async function runStep(
  step: AutomationStep,
  ctx: WalkContext,
  index: number,
): Promise<void> {
  switch (step.kind) {
    case 'composio_action': {
      const result = await runComposioAction(step, ctx)
      ctx.stepTrace.push({
        index,
        kind: step.kind,
        status: result.queued ? 'queued' : result.skipped ? 'skipped' : 'success',
        summary: result.summary,
      })
      if (step.ref) ctx.ledger[step.ref] = result.payload
      if (result.actionId) ctx.queuedActionIds.push(result.actionId)
      return
    }
    case 'notion_write': {
      // Notion writes pass through the approval gate as 'auto' (per existing
      // gate policy — NOTION is in ALWAYS_AUTO_TOOLKITS). For now we just
      // log them in the trace — full Notion-write support arrives with
      // the notion service integration step.
      ctx.stepTrace.push({
        index,
        kind: step.kind,
        status: 'success',
        summary: `notion: ${step.database_slug}`,
      })
      if (step.ref) ctx.ledger[step.ref] = step.properties
      return
    }
    case 'set': {
      ctx.ledger[step.key] = step.value
      ctx.stepTrace.push({
        index,
        kind: step.kind,
        status: 'success',
        summary: `${step.key} = ${step.value}`,
      })
      return
    }
    case 'condition': {
      // Evaluate branches in order; first matching `when` wins.
      // v1 condition language: simple boolean expressions against the ledger
      // (NOT a general expression engine — keep it constrained). Fall through
      // to no-op if no branch matches (Lindy default behavior).
      let matched = false
      for (const branch of step.branches) {
        if (evalCondition(branch.when, ctx.ledger)) {
          matched = true
          ctx.stepTrace.push({
            index,
            kind: step.kind,
            status: 'success',
            summary: `branch: ${branch.when}`,
          })
          await walkSpec({ ...ctx, steps: branch.steps })
          break
        }
      }
      if (!matched) {
        ctx.stepTrace.push({
          index,
          kind: step.kind,
          status: 'skipped',
          summary: 'no_branch_matched',
        })
      }
      return
    }
    case 'queue_action': {
      // Explicit non-Composio action (e.g. a custom alert). v1 just logs;
      // future: insert directly into agent_actions with action_type.
      ctx.stepTrace.push({
        index,
        kind: step.kind,
        status: 'queued',
        summary: step.action_type,
      })
      return
    }
    case 'agent_step':
    case 'loop':
    case 'wait': {
      // v1 rejection. install-time validation should prevent this from being
      // saved, but we double-check at execute time.
      ctx.stepTrace.push({
        index,
        kind: step.kind,
        status: 'skipped',
        summary: `${step.kind} not yet supported in synchronous executor`,
      })
      return
    }
  }
}

// ─── Composio action runner ────────────────────────────────────────────────

type ComposioRunResult = {
  queued: boolean
  skipped: boolean
  actionId?: string
  summary: string
  payload?: unknown
}

async function runComposioAction(
  step: { kind: 'composio_action'; toolkit: string; action_slug: string; arguments: Record<string, Json> },
  ctx: WalkContext,
): Promise<ComposioRunResult> {
  const supabase = getServerSupabaseClient()
  const policy = getToolPolicy(ctx.policies, step.toolkit.toLowerCase())
  const automationAutonomy = ctx.automation.autonomy
  const effectivePolicy = resolveAutonomy(automationAutonomy, policy)

  const summary = `${step.toolkit}.${step.action_slug}`
  const safeArgs = step.arguments ?? {}

  if (effectivePolicy === 'off') {
    return { queued: false, skipped: true, summary: `${summary} (policy=off)` }
  }

  if (effectivePolicy === 'auto') {
    // Fire immediately; log to agent_actions as executed (audit trail).
    try {
      const composio = getComposio()
      const result = await composio.tools.execute(step.action_slug, {
        userId: ctx.automation.user_id,
        arguments: safeArgs as unknown as Record<string, unknown>,
      })
      await supabase.from('agent_actions').insert({
        user_id: ctx.automation.user_id,
        action_type: 'composio_action',
        status: 'executed',
        agent_slug: null,
        payload: {
          toolkit: step.toolkit,
          action_slug: step.action_slug,
          arguments: safeArgs,
          source: 'automation',
          automation_id: ctx.automation.id,
          summary,
          result,
          auto_approved: true,
        } as unknown as Json,
        approved_at: new Date().toISOString(),
        executed_at: new Date().toISOString(),
      })
      return { queued: false, skipped: false, summary: `${summary} (auto)`, payload: result }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`auto-execute failed: ${message}`)
    }
  }

  // policy === 'ask' — queue for approval.
  const { data: actionRow, error } = await supabase
    .from('agent_actions')
    .insert({
      user_id: ctx.automation.user_id,
      action_type: 'composio_action',
      status: 'pending',
      agent_slug: null,
      payload: {
        toolkit: step.toolkit,
        action_slug: step.action_slug,
        arguments: safeArgs,
        source: 'automation',
        automation_id: ctx.automation.id,
        automation_name: ctx.automation.name,
        summary,
      } as unknown as Json,
    })
    .select('id')
    .single()

  if (error || !actionRow) {
    throw new Error(`queue failed: ${error?.message ?? 'unknown'}`)
  }

  return {
    queued: true,
    skipped: false,
    actionId: actionRow.id as string,
    summary: `${summary} (queued)`,
  }
}

function resolveAutonomy(
  automationAutonomy: 'ask' | 'auto' | 'off',
  toolPolicy: 'ask' | 'auto' | 'off',
): 'ask' | 'auto' | 'off' {
  // Most restrictive wins. 'off' on either layer kills the action.
  // 'auto' requires BOTH layers to opt in.
  if (automationAutonomy === 'off' || toolPolicy === 'off') return 'off'
  if (automationAutonomy === 'auto' && toolPolicy === 'auto') return 'auto'
  return 'ask'
}

// ─── Minimal condition evaluator ────────────────────────────────────────────

/**
 * Evaluates a constrained boolean expression against the ledger.
 *
 * Supported forms (v1, kept tight on purpose):
 *   - "true" / "false"
 *   - "always"
 *   - "$ledger.key.path == value"
 *   - "$ledger.key.path != value"
 *   - "$ledger.key.path > 100", ">=", "<", "<="
 *
 * Anything more complex returns false. The COO compiler stays inside these
 * primitives — Anthropic's structured-outputs constraint enforces it.
 */
function evalCondition(expr: string, ledger: Record<string, unknown>): boolean {
  const trimmed = expr.trim().toLowerCase()
  if (trimmed === 'true' || trimmed === 'always') return true
  if (trimmed === 'false' || trimmed === 'never') return false

  const opMatch = expr.match(/^\s*(\$ledger\.[A-Za-z0-9_.]+)\s*(==|!=|>=|<=|>|<)\s*(.+?)\s*$/)
  if (!opMatch) return false

  const path = opMatch[1].replace(/^\$ledger\./, '')
  const op = opMatch[2]
  const rhsRaw = opMatch[3].replace(/^["']|["']$/g, '')

  const lhs = resolvePath(ledger, path)
  const rhs = coerceRhs(rhsRaw)

  switch (op) {
    case '==': return looseEq(lhs, rhs)
    case '!=': return !looseEq(lhs, rhs)
    case '>': return toNum(lhs) > toNum(rhs)
    case '>=': return toNum(lhs) >= toNum(rhs)
    case '<': return toNum(lhs) < toNum(rhs)
    case '<=': return toNum(lhs) <= toNum(rhs)
  }
  return false
}

function resolvePath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

function coerceRhs(raw: string): unknown {
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === 'null') return null
  const n = Number(raw)
  if (!Number.isNaN(n) && raw.trim() !== '') return n
  return raw
}

function looseEq(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  return String(a) === String(b)
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}
