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
import type { Json } from '<npm>/lib/database.types'

/** Source surface that's invoking the agent — informs the customer card. */
export type ApprovalSource = 'cron-agent' | 'coo-chat'

export type ApprovalGateOptions = {
  userId: string
  source: ApprovalSource
  /** Slug of the agent issuing the call, if known (e.g. 'revenue', 'collections'). */
  agentSlug?: string
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
 */
export function wrapToolsWithApprovalGate(
  tools: Record<string, Tool>,
  opts: ApprovalGateOptions,
): Record<string, Tool> {
  const wrapped: Record<string, Tool> = {}

  for (const [actionSlug, originalTool] of Object.entries(tools)) {
    if (!isWriteAction(actionSlug)) {
      wrapped[actionSlug] = originalTool
      continue
    }
    wrapped[actionSlug] = makeQueueingTool(actionSlug, originalTool, opts)
  }

  return wrapped
}

/**
 * Replaces a tool's `execute` with one that queues to agent_actions and
 * returns a "queued" envelope to the model. Preserves the original
 * description + input schema so the model still sees the tool as available.
 */
function makeQueueingTool(
  actionSlug: string,
  originalTool: Tool,
  opts: ApprovalGateOptions,
): Tool {
  const toolkit = actionSlug.split('_')[0].toLowerCase()

  return tool({
    description:
      `[Requires customer approval before executing] ` +
      (originalTool.description ?? `Composio action ${actionSlug}`),
    // The Composio-provided schema is already in Vercel AI SDK shape; pass it
    // through so the model populates args identically to the un-gated version.
    inputSchema: (originalTool.inputSchema as z.ZodType) ?? z.object({}),
    execute: async (args: unknown) => {
      const supabase = getServerSupabaseClient()
      const summary = summarize(actionSlug, args)

      const payload = {
        toolkit,
        action_slug: actionSlug,
        arguments: (args ?? {}) as Record<string, unknown>,
        source: opts.source,
        agent_slug: opts.agentSlug,
        summary,
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
    },
  })
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
