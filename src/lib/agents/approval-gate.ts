/**
 * Approval gate for Composio tool calls.
 *
 * Wraps the Vercel-AI-SDK-shaped tools returned by Composio so that *write*
 * actions don't fire directly — instead they queue a row in `agent_actions`
 * with status='pending' and return a "queued" payload to the model. The
 * customer reviews and approves at /dashboard/actions; the executor fires the
 * actual Composio call when they click Approve.
 *
 * Reads pass through unchanged. Notion writes pass through unchanged too —
 * the customer's own Brain is theirs to write to freely (gating it would
 * break the "Notion as company OS" model).
 *
 * Same pattern used by Lindy, Zapier HITL, Claude Code, Devin v1 — and named
 * by Anthropic's "Building Effective Agents" as the canonical control
 * primitive. We layer in the universal write classifier so individual agents
 * don't need to know which actions are risky.
 */

import { tool, type Tool } from 'ai'
import { z } from 'zod'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { getComposio } from '<npm>/lib/composio'
import type { Json } from '<npm>/lib/database.types'
import {
  getToolPolicy,
  loadToolPolicies,
  type ToolPolicyMap,
} from './tool-policies'

/** Source surface that's invoking the agent — informs the customer card. */
export type ApprovalSource = 'cron-agent' | 'coo-chat'

export type ApprovalGateOptions = {
  userId: string
  source: ApprovalSource
  /** Slug of the agent issuing the call, if known (e.g. 'revenue', 'collections'). */
  agentSlug?: string
  /**
   * Pre-loaded user policy map. When omitted, the gate loads policies once
   * at wrap time. Pass explicitly when the caller already loaded them to
   * avoid a duplicate query.
   */
  policies?: ToolPolicyMap
}

// Verbs that mark a Composio action as read-only. Anything not matching
// is treated as a write (fail-closed — safer to over-gate than miss a send).
const READ_VERBS = new Set([
  'LIST', 'GET', 'FETCH', 'SEARCH', 'RETRIEVE', 'FIND', 'COUNT',
  'READ', 'QUERY', 'CHECK', 'VIEW', 'EXPORT', 'DOWNLOAD',
])

// Toolkit prefixes whose writes are always safe (customer-owned data).
// Notion is the customer's Brain — agents update it as their core job.
const ALWAYS_AUTO_TOOLKITS = new Set(['NOTION'])

/**
 * Classify a Composio action slug as a write (needs approval) or read (auto).
 * Slug shape: `<TOOLKIT>_<VERB>_<NOUN...>` (e.g. `GMAIL_SEND_EMAIL`).
 */
export function isWriteAction(actionSlug: string): boolean {
  const upper = actionSlug.toUpperCase()
  const parts = upper.split('_')
  if (parts.length < 2) return true // weird shape — gate it

  const toolkit = parts[0]
  if (ALWAYS_AUTO_TOOLKITS.has(toolkit)) return false

  const verb = parts[1]
  if (READ_VERBS.has(verb)) return false

  // Also catch `GMAIL_GET_*` style where verb is the 2nd token but combined
  // forms like `GET_BY_ID` exist — already covered since verb === 'GET'.
  return true
}

/**
 * Returns a new tools object where write actions are intercepted by the
 * approval gate. The model "calling" a gated tool sees a queued response
 * with the action_id, not the real execution result.
 *
 * Per-tool policy ('ask' | 'auto' | 'off') is resolved at execute time so
 * customers can flip toolkit autonomy without re-instantiating the agent.
 */
export async function wrapToolsWithApprovalGate(
  tools: Record<string, Tool>,
  opts: ApprovalGateOptions,
): Promise<Record<string, Tool>> {
  const wrapped: Record<string, Tool> = {}
  const policies = opts.policies ?? (await loadToolPolicies(opts.userId))

  for (const [actionSlug, originalTool] of Object.entries(tools)) {
    if (!isWriteAction(actionSlug)) {
      wrapped[actionSlug] = originalTool
      continue
    }
    wrapped[actionSlug] = makeGatedTool(actionSlug, originalTool, opts, policies)
  }

  return wrapped
}

/**
 * Replaces a tool's `execute` with policy-aware behavior:
 *   policy='off'  → return an error to the model so it doesn't retry
 *   policy='auto' → fire Composio immediately, log to agent_actions as executed
 *   policy='ask'  → queue to agent_actions for human approval (default)
 *
 * Preserves the original description + input schema so the model still
 * sees the tool as available.
 */
function makeGatedTool(
  actionSlug: string,
  originalTool: Tool,
  opts: ApprovalGateOptions,
  policies: ToolPolicyMap,
): Tool {
  const toolkit = actionSlug.split('_')[0].toLowerCase()
  const description = originalTool.description ?? `Composio action ${actionSlug}`

  return tool({
    description: `[Subject to customer's per-tool autonomy policy] ${description}`,
    inputSchema: (originalTool.inputSchema as z.ZodType) ?? z.object({}),
    execute: async (args: unknown) => {
      const policy = getToolPolicy(policies, toolkit)
      const summary = summarize(actionSlug, args)
      const safeArgs = (args ?? {}) as Record<string, unknown>

      if (policy === 'off') {
        return {
          queued: false,
          executed: false,
          policy_blocked: true,
          message:
            `Tool ${actionSlug} is disabled by the customer's policy. ` +
            `Tell the customer in your reply that you skipped this action ` +
            `because they have ${toolkit} set to "Off" in their automation settings.`,
        }
      }

      if (policy === 'auto') {
        return await executeImmediately({ actionSlug, toolkit, args: safeArgs, summary, opts })
      }

      // policy === 'ask' (default) — queue for approval
      return await queueForApproval({ actionSlug, toolkit, args: safeArgs, summary, opts })
    },
  })
}

/** Auto-mode path: fire Composio now, log to agent_actions as executed. */
async function executeImmediately(input: {
  actionSlug: string
  toolkit: string
  args: Record<string, unknown>
  summary: string
  opts: ApprovalGateOptions
}): Promise<unknown> {
  const { actionSlug, toolkit, args, summary, opts } = input
  const supabase = getServerSupabaseClient()
  const composio = getComposio()
  const nowIso = new Date().toISOString()

  try {
    const result = await composio.tools.execute(actionSlug, {
      userId: opts.userId,
      arguments: args,
    })

    const payload = {
      toolkit,
      action_slug: actionSlug,
      arguments: args,
      source: opts.source,
      agent_slug: opts.agentSlug,
      summary,
      result: result as unknown,
      auto_approved: true,
    }

    // Audit trail: log even though no human approved. The runs view shows
    // these alongside queued actions so the customer can review later.
    await supabase.from('agent_actions').insert({
      user_id: opts.userId,
      action_type: 'composio_action',
      status: 'executed',
      agent_slug: opts.agentSlug ?? null,
      payload: payload as unknown as Json,
      approved_at: nowIso,
      executed_at: nowIso,
    })

    return {
      queued: false,
      executed: true,
      auto_approved: true,
      action_slug: actionSlug,
      summary,
      result,
      message: `Executed immediately (customer has ${toolkit} set to Auto).`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[approval-gate] auto execute failed:', actionSlug, message)
    return {
      queued: false,
      executed: false,
      error: `Composio execute failed: ${message}`,
    }
  }
}

/** Default path: queue to agent_actions for human approval. */
async function queueForApproval(input: {
  actionSlug: string
  toolkit: string
  args: Record<string, unknown>
  summary: string
  opts: ApprovalGateOptions
}): Promise<unknown> {
  const { actionSlug, toolkit, args, summary, opts } = input
  const supabase = getServerSupabaseClient()

  // Heuristic confidence score (0–100). The evaluator agent refines these
  // daily with LLM reasoning over the full context.
  const confidenceScore = deriveConfidence(actionSlug)

  const payload = {
    toolkit,
    action_slug: actionSlug,
    arguments: args,
    source: opts.source,
    agent_slug: opts.agentSlug,
    summary,
    confidence_score: confidenceScore,
  }

  const { data, error } = await supabase
    .from('agent_actions')
    .insert({
      user_id: opts.userId,
      action_type: 'composio_action',
      status: 'pending',
      agent_slug: opts.agentSlug ?? null,
      payload: payload as unknown as Json,
    })
    .select('id')
    .single()

  if (error || !data) {
    return {
      queued: false,
      error: `Could not queue action: ${error?.message ?? 'unknown'}`,
    }
  }

  return {
    queued: true,
    action_id: data.id,
    action_slug: actionSlug,
    summary,
    message:
      `Queued for customer approval. Will execute once approved at /dashboard/actions. ` +
      `Do NOT retry this action — the customer will see it.`,
  }
}

/**
 * Heuristic confidence score for a queued action (0–100).
 * The evaluator agent refines these with full context daily.
 *
 * Rules (fail-safe — lower score = more human review):
 *  - Destructive verbs (DELETE, REMOVE, CANCEL, CLOSE): 40
 *  - Financial verbs (SEND_INVOICE, CREATE_PAYMENT, REFUND): 55
 *  - Comms verbs (SEND, REPLY, CREATE_MESSAGE, POST): 65
 *  - Create/update verbs (CREATE, UPDATE, ADD): 70
 *  - Everything else: 75
 */
function deriveConfidence(actionSlug: string): number {
  const upper = actionSlug.toUpperCase()
  if (/_(DELETE|REMOVE|CANCEL|CLOSE|ARCHIVE)/.test(upper)) return 40
  if (/_(SEND_INVOICE|CREATE_INVOICE|CREATE_PAYMENT|REFUND|CHARGE)/.test(upper)) return 55
  if (/_(SEND|REPLY|CREATE_MESSAGE|POST|PUBLISH)/.test(upper)) return 65
  if (/_(CREATE|UPDATE|ADD|SET|ASSIGN)/.test(upper)) return 70
  return 75
}

/**
 * One-line human summary of what the action would do. Used in the customer's
 * pending-action card. Best-effort — pulls common arg names; falls back to
 * "Run <slug>" if nothing readable is found.
 */
function summarize(actionSlug: string, args: unknown): string {
  const a = (args ?? {}) as Record<string, unknown>
  const recipient = a.to ?? a.recipient ?? a.recipient_email ?? a.email
  const subject = a.subject ?? a.title ?? a.summary
  const amount = a.amount ?? a.amount_due

  const parts: string[] = []
  const human = actionSlug
    .toLowerCase()
    .split('_')
    .slice(1)
    .join(' ')
  parts.push(human)
  if (recipient) parts.push(`→ ${String(recipient)}`)
  if (subject) parts.push(`"${String(subject).slice(0, 60)}"`)
  if (amount) parts.push(`$${String(amount)}`)
  return parts.join(' ')
}
