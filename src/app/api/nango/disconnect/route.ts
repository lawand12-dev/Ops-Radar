/**
 * POST /api/nango/disconnect
 *
 * Removes the customer's Nango connection for one integration.
 * After this, agents that need that toolkit will fail gracefully via
 * the hasNangoConnection() preflight check.
 *
 * Body: { tool_slug: 'gmail' | ... }
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import {
  getNango,
  NANGO_TOOLS,
  resolveConnectionId,
  clearConnectionCache,
  type NangoToolSlug,
} from '<npm>/lib/nango'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Body = { tool_slug?: string }

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as Body | null
  const slug = body?.tool_slug
  if (!slug || !(slug in NANGO_TOOLS)) {
    return NextResponse.json(
      { error: 'invalid_tool', message: `Unknown tool_slug "${slug}".` },
      { status: 400 },
    )
  }

  const tool = slug as NangoToolSlug
  const providerConfigKey = NANGO_TOOLS[tool]

  // Look up the actual Nango connectionId for this user+tool. If they
  // don't have one, treat as already-gone (idempotent).
  const connectionId = await resolveConnectionId(userId, tool)
  if (!connectionId) {
    return NextResponse.json({ disconnected: true, tool_slug: slug, already_gone: true })
  }

  try {
    const nango = getNango()
    await nango.deleteConnection(providerConfigKey, connectionId)
    clearConnectionCache(userId, tool)

    // Dismiss any pending agent_actions that target this toolkit so the
    // customer can't approve a queued send for a tool they just removed
    // (would surface as "no connection" runtime error). Fire-and-forget;
    // failure here doesn't block the disconnect from succeeding.
    void cancelPendingActionsForToolkit(userId, tool).catch((err) => {
      console.warn(
        `[api/nango/disconnect] cancelPendingActionsForToolkit failed:`,
        err instanceof Error ? err.message : err,
      )
    })

    return NextResponse.json({ disconnected: true, tool_slug: slug })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('404') || message.toLowerCase().includes('not found')) {
      clearConnectionCache(userId, tool)
      return NextResponse.json({ disconnected: true, tool_slug: slug, already_gone: true })
    }
    console.error('[api/nango/disconnect] deleteConnection failed:', message)
    return NextResponse.json(
      { error: 'nango_error', message: `Could not disconnect ${slug}: ${message}` },
      { status: 500 },
    )
  }
}

/**
 * Mark every pending agent_actions row for this user+toolkit as
 * 'dismissed' with a clear reason. We use the payload->>toolkit field
 * (set at enqueue time) to scope the dismissal to the right toolkit.
 *
 * Safe to run even if no rows exist — just returns 0 affected.
 */
async function cancelPendingActionsForToolkit(
  userId: string,
  tool: NangoToolSlug,
): Promise<void> {
  const supabase = getServerSupabaseClient()
  const { error } = await supabase
    .from('agent_actions')
    .update({ status: 'dismissed' })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .filter('payload->>toolkit', 'eq', tool)
  if (error) {
    throw new Error(error.message)
  }
}
