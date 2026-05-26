/**
 * POST /api/nango/connect
 *
 * Creates a short-lived Nango Connect Session token bound to the current
 * customer (auth.users.id), restricted to the requested integration.
 * The frontend uses this token with @nangohq/frontend's openConnectUI()
 * to launch the OAuth popup.
 *
 * Body: { tool_slug: 'gmail' | 'hubspot' | ... } — OpsRadar slug
 * Returns: { sessionToken: string } on success
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'
import { getNango, NANGO_TOOLS, type NangoToolSlug } from '<npm>/lib/nango'
import { applyRateLimit } from '<npm>/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Body = { tool_slug?: string }

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Per-customer rate limit: 10 connect-session creations/hour. Stops a
  // misbehaving frontend from spamming Nango with session tokens (each
  // token has a 30m TTL; 10/hour is plenty for any real reconnect flow).
  const limited = await applyRateLimit(request, 'integrations-connect', userId)
  if (limited) return limited as unknown as NextResponse

  const body = (await request.json().catch(() => null)) as Body | null
  const slug = body?.tool_slug
  if (!slug || !(slug in NANGO_TOOLS)) {
    return NextResponse.json(
      {
        error: 'invalid_tool',
        message: `Unknown tool_slug "${slug}". Valid: ${Object.keys(NANGO_TOOLS).join(', ')}.`,
      },
      { status: 400 },
    )
  }

  const providerConfigKey = NANGO_TOOLS[slug as NangoToolSlug]

  // Pull the customer's email so Nango can show it in the OAuth flow.
  let endUserEmail = ''
  try {
    const supabase = await getSessionSupabaseClient()
    const { data } = await supabase.auth.getUser()
    endUserEmail = data.user?.email ?? ''
  } catch {
    // Non-fatal — Nango accepts an empty email; the flow still works.
  }

  try {
    const nango = getNango()
    const { data } = await nango.createConnectSession({
      // First-class identity binding — required by Nango unless tags is
      // provided. We pass both for forward-compat and so the dashboard
      // shows a sensible "end user" entry.
      end_user: {
        id: userId,
        ...(endUserEmail ? { email: endUserEmail } : {}),
      },
      // Tags are also copied onto the resulting connection — that's how
      // listConnections({ tags }) filters work, so this stays our
      // canonical "who owns this connection" channel.
      tags: {
        end_user_id: userId,
        ...(endUserEmail ? { end_user_email: endUserEmail } : {}),
      },
      allowed_integrations: [providerConfigKey],
    })
    return NextResponse.json({ sessionToken: data.token })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/nango/connect] createConnectSession failed:', message)
    return NextResponse.json(
      { error: 'nango_error', message: `Could not start ${slug} OAuth: ${message}` },
      { status: 500 },
    )
  }
}
