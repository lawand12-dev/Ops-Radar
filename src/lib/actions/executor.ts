/**
 * Action executor — fires a previously-queued action when the customer
 * approves it in /dashboard/actions.
 *
 * Two paths in / one path out:
 *
 *   - cron-agent path: runAgent's approval gate enqueues a row →
 *     customer clicks Approve → this executor runs the call the gate
 *     originally intercepted.
 *
 *   - coo-chat path: COO chat decides to call a tool → same flow.
 *
 * The executor reads the row's `payload.action_slug` (= tool name like
 * 'gmail_send') and `payload.arguments` and dispatches the tool's
 * `execute()` directly. The approval gate is NOT re-checked — by this
 * point the customer has explicitly OK'd it.
 *
 * NOTE: no integration toolkits are registered right now (the integrations
 * layer was removed), so there is no dispatcher to run — executeAction
 * logs a warning and returns. When toolkits return, restore the lookup:
 * map `action_slug` → the owning toolkit's `execute()` and run it here.
 */

import type { AgentAction } from './types'

type ToolActionPayload = {
  toolkit?: string
  action_slug?: string
  arguments?: Record<string, unknown>
  agent_slug?: string
}

export async function executeAction(action: AgentAction): Promise<void> {
  if (action.action_type !== 'tool_action') {
    console.warn(
      `[executeAction] Unsupported action_type "${action.action_type}". Only tool_action is supported.`,
    )
    return
  }

  const payload = action.payload as unknown as ToolActionPayload
  const toolName = payload.action_slug
  const userId = action.user_id

  if (!userId || !toolName) {
    console.warn('[executeAction] missing userId or toolName')
    return
  }

  console.warn(
    `[executeAction] No tool dispatcher is wired — "${toolName}" for user ${userId} was approved but not executed (agent: ${payload.agent_slug ?? 'unknown'})`,
  )
}

/**
 * Legacy alias used by /api/mcp/route.ts. Same behavior — runs one action
 * by its row. Kept for backwards compat with that one call site.
 */
export async function executeToolCall(action: AgentAction): Promise<void> {
  return executeAction(action)
}
