/**
 * Action executor — fires a previously-queued action when the customer
 * approves it in /dashboard/actions.
 *
 * Two paths in / one path out:
 *
 *   - cron-agent path: runAgent → wrapToolsWithGate enqueues a row →
 *     customer clicks Approve → this executor runs the Nango call the
 *     gate originally intercepted.
 *
 *   - coo-chat path: COO chat decides to call a tool → same flow.
 *
 * The executor reads the row's `payload.action_slug` (= tool name like
 * 'gmail_send') and `payload.arguments`, looks up the tool in the Nango
 * registry, and dispatches its `execute()` directly. The approval gate is
 * NOT re-checked — by this point the customer has explicitly OK'd it.
 */

import type { AgentAction } from './types'
import { TOOLKITS } from '<npm>/lib/nango/registry'

type ComposioActionPayload = {
  toolkit?: string
  action_slug?: string
  arguments?: Record<string, unknown>
  agent_slug?: string
}

type ToolDispatch = (args: Record<string, unknown>) => Promise<unknown>

function findDispatch(toolName: string, userId: string): ToolDispatch | null {
  for (const [, entry] of Object.entries(TOOLKITS)) {
    const core = entry.buildCore(userId)
    if (toolName in core) {
      const t = core[toolName]
      if (t && typeof t.execute === 'function') {
        const fn = t.execute as (a: unknown, o: unknown) => Promise<unknown>
        return (a) => fn(a, {})
      }
    }
    const advanced = entry.buildAdvanced(userId)
    if (toolName in advanced) {
      const t = advanced[toolName]
      if (t && typeof t.execute === 'function') {
        const fn = t.execute as (a: unknown, o: unknown) => Promise<unknown>
        return (a) => fn(a, {})
      }
    }
  }
  return null
}

export async function executeAction(action: AgentAction): Promise<void> {
  if (action.action_type !== 'composio_action') {
    console.warn(
      `[executeAction] Unsupported action_type "${action.action_type}". Only composio_action is wired on Nango today.`,
    )
    return
  }

  const payload = action.payload as unknown as ComposioActionPayload
  const toolName = payload.action_slug
  const args = payload.arguments ?? {}
  const userId = action.user_id

  if (!userId || !toolName) {
    console.warn('[executeAction] missing userId or toolName')
    return
  }

  const dispatch = findDispatch(toolName, userId)
  if (!dispatch) {
    console.warn(`[executeAction] No dispatcher found for tool "${toolName}"`)
    return
  }

  try {
    const result = await dispatch(args)
    console.info(
      `[executeAction] ${toolName} dispatched for user ${userId} — agent: ${payload.agent_slug ?? 'unknown'}`,
    )
    void result
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[executeAction] ${toolName} failed:`, msg)
    throw err
  }
}

/**
 * Legacy alias used by /api/mcp/route.ts. Same behavior — runs one action
 * by its row. Kept for backwards compat with that one call site.
 */
export async function executeToolCall(action: AgentAction): Promise<void> {
  return executeAction(action)
}
