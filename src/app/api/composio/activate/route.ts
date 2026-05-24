import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { COMPOSIO_TOOLS, type ToolSlug, getComposio } from '<npm>/lib/composio'
import { refreshCapabilitiesForUser } from '<npm>/lib/composio/capability-cache'
import { provisionBrainFromComposio } from '<npm>/lib/notion/provision'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_SLUGS = new Set(Object.keys(COMPOSIO_TOOLS) as ToolSlug[])

/**
 * POST /api/composio/activate
 *
 * Called by the integrations page when the user lands back from OAuth with
 * ?connected={tool_slug}. The webhook-based activation is unreliable (it
 * depends on Composio delivering the event, which may be delayed or skipped).
 *
 * This endpoint verifies the connection status directly with Composio and
 * sets is_active=true in composio_connections if the connection is live.
 *
 * Body: { tool_slug: string }
 * Returns: { activated: boolean, status?: string }
 */
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const toolSlug = body?.tool_slug
  if (typeof toolSlug !== 'string' || !VALID_SLUGS.has(toolSlug as ToolSlug)) {
    return NextResponse.json({ error: 'invalid_tool_slug' }, { status: 400 })
  }

  // Composio appends connected_account_id (ca_xxx) to the OAuth callback URL.
  // This is the FINAL connected account ID and may differ from the connectionRequest.id
  // stored at connect-time. When provided, use it directly and correct the DB row.
  const callbackAccountId = typeof body?.connected_account_id === 'string'
    ? body.connected_account_id
    : undefined

  const supabase = getServerSupabaseClient()

  // If the callback gave us the definitive ID, upsert it into the DB first so
  // all subsequent lookups (provision, capability cache) use the correct ID.
  if (callbackAccountId) {
    await supabase
      .from('composio_connections')
      .upsert(
        { user_id: userId, tool_slug: toolSlug, composio_connection_id: callbackAccountId, is_active: false },
        { onConflict: 'user_id,tool_slug' },
      )
  }

  // Get the connection ID to verify — prefer the callback-supplied ID.
  const { data: row, error: selectErr } = await supabase
    .from('composio_connections')
    .select('composio_connection_id, is_active')
    .eq('user_id', userId)
    .eq('tool_slug', toolSlug)
    .maybeSingle()

  if (selectErr) {
    console.error('[composio/activate] select failed:', selectErr)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const connectionId = callbackAccountId ?? row?.composio_connection_id
  if (!connectionId) {
    return NextResponse.json({ activated: false, status: 'no_pending_connection' })
  }

  // Already active — nothing to do.
  if (row?.is_active && !callbackAccountId) {
    return NextResponse.json({ activated: true, status: 'already_active' })
  }

  // Verify current status directly with Composio.
  let composioStatus: string
  try {
    const composio = getComposio()
    const conn = await composio.connectedAccounts.get(connectionId)
    composioStatus = (conn.status as string | undefined) ?? ''
  } catch (err) {
    console.error('[composio/activate] Composio get failed:', err)
    return NextResponse.json({ activated: false, status: 'composio_unreachable' })
  }

  const isActive = composioStatus.toUpperCase() === 'ACTIVE'
  if (!isActive) {
    console.log('[composio/activate] connection not yet active:', { userId, toolSlug, composioStatus })
    return NextResponse.json({ activated: false, status: composioStatus })
  }

  // Flip is_active and lock in the correct connection ID.
  const { error: updateErr } = await supabase
    .from('composio_connections')
    .update({ is_active: true, connected_at: new Date().toISOString(), composio_connection_id: connectionId })
    .eq('user_id', userId)
    .eq('tool_slug', toolSlug)

  if (updateErr) {
    console.error('[composio/activate] update failed:', updateErr)
    return NextResponse.json({ error: 'db_update_failed' }, { status: 500 })
  }

  console.log('[composio/activate] activated:', { userId, toolSlug })

  // Side-effects (same as webhook handler).
  refreshCapabilitiesForUser(userId, [toolSlug]).catch((err) =>
    console.warn('[composio/activate] capability refresh failed:', err),
  )

  if (toolSlug === 'notion') {
    provisionBrainFromComposio(userId, connectionId).catch((err) =>
      console.error('[composio/activate] brain provision failed:', err instanceof Error ? err.message : err),
    )
  }

  return NextResponse.json({ activated: true, status: 'ACTIVE' })
}
