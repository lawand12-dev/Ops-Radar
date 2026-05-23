/**
 * Composio data-fetch helper for dashboard widgets + agents.
 *
 * Use this anywhere we need to fetch live data from a customer's connected tool.
 * Replaces the Model C `decryptApiKey + adapter.fetch*()` pattern.
 *
 * Flow:
 *   1. Look up the user's composio_connections row for this tool_slug
 *   2. If not connected (or inactive) → throws `ComposioNotConnectedError`
 *   3. Call composio.tools.execute(actionSlug, { userId, arguments }) — Composio
 *      authenticates the request using the OAuth tokens it holds
 *   4. Return the typed response payload
 *
 * Why this pattern: dashboard widgets need deterministic, fast, structured data.
 * `tools.execute()` runs a single Composio action and returns the raw API response —
 * no LLM in the loop. Adapter shaping logic stays in the route handler.
 */

import { getComposio, type ToolSlug } from './composio'
import { getServerSupabaseClient } from './supabase-server'

export class ComposioNotConnectedError extends Error {
  constructor(public readonly toolSlug: ToolSlug) {
    super(`Composio connection for ${toolSlug} is missing or inactive.`)
    this.name = 'ComposioNotConnectedError'
  }
}

export class ComposioExecuteError extends Error {
  constructor(
    public readonly toolSlug: ToolSlug,
    public readonly actionSlug: string,
    cause: unknown,
  ) {
    super(`Composio ${actionSlug} failed: ${cause instanceof Error ? cause.message : String(cause)}`)
    this.name = 'ComposioExecuteError'
  }
}

/** Per-(user, tool) connection presence check. Returns true only when row exists and is_active. */
export async function isComposioConnected(userId: string, toolSlug: ToolSlug): Promise<boolean> {
  const supabase = getServerSupabaseClient()
  const { data } = await supabase
    .from('composio_connections')
    .select('is_active')
    .eq('user_id', userId)
    .eq('tool_slug', toolSlug)
    .eq('is_active', true)
    .maybeSingle()
  return !!data
}

/** Returns the slugs of all toolkits this user has active Composio connections for. */
export async function listConnectedToolSlugs(userId: string): Promise<ToolSlug[]> {
  const supabase = getServerSupabaseClient()
  const { data } = await supabase
    .from('composio_connections')
    .select('tool_slug')
    .eq('user_id', userId)
    .eq('is_active', true)
  return ((data ?? []).map((r) => r.tool_slug) as ToolSlug[])
}

/**
 * Execute a Composio action on behalf of a user and return the response payload.
 *
 * Example:
 *   const r = await executeComposioAction<{ data: { object: 'list', data: Subscription[] }}>(
 *     userId, 'stripe', 'STRIPE_LIST_SUBSCRIPTIONS', { status: 'active', limit: 100 }
 *   )
 *
 * Throws ComposioNotConnectedError if the user hasn't connected this tool.
 * Throws ComposioExecuteError on any execution failure (caller decides how to surface).
 */
export async function executeComposioAction<TPayload = unknown>(
  userId: string,
  toolSlug: ToolSlug,
  actionSlug: string,
  args: Record<string, unknown> = {},
): Promise<TPayload> {
  const connected = await isComposioConnected(userId, toolSlug)
  if (!connected) {
    throw new ComposioNotConnectedError(toolSlug)
  }

  const composio = getComposio()
  try {
    const response = await composio.tools.execute(actionSlug, {
      userId,
      arguments: args,
    })
    // Composio wraps response.data as the actual payload. Some actions also return
    // a successful=false flag — surface that as an error so callers don't silently
    // get garbage shapes.
    if (response && typeof response === 'object' && 'successful' in response && response.successful === false) {
      throw new Error(
        (response as { error?: string }).error ?? 'Composio reported successful=false',
      )
    }
    return (response?.data ?? response) as TPayload
  } catch (err) {
    throw new ComposioExecuteError(toolSlug, actionSlug, err)
  }
}

/**
 * Convenience: returns null if the user isn't connected (instead of throwing).
 * Use this in dashboard widgets that should render an empty state when the
 * customer hasn't connected the tool yet.
 */
export async function safeExecuteComposioAction<TPayload = unknown>(
  userId: string,
  toolSlug: ToolSlug,
  actionSlug: string,
  args: Record<string, unknown> = {},
): Promise<TPayload | null> {
  try {
    return await executeComposioAction<TPayload>(userId, toolSlug, actionSlug, args)
  } catch (err) {
    if (err instanceof ComposioNotConnectedError) return null
    throw err
  }
}
