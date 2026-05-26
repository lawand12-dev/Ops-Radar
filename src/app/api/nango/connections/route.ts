/**
 * GET /api/nango/connections
 *
 * Returns the customer's active Nango connections, mapped back to OpsRadar
 * tool slugs. Used by /dashboard/integrations to render green / disconnect
 * state on each card.
 *
 * Single network call to nango.listConnections({ tags: { end_user_id } }),
 * filtered on the server. Nango assigns auto-generated connection_ids, so
 * we look up "what does this customer have" via the end_user_id tag we set
 * at session-creation time.
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { getNango, NANGO_TOOLS, type NangoToolSlug } from '<npm>/lib/nango'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type NangoConnectionRow = {
  id?: number
  connection_id?: string
  provider_config_key?: string
  provider?: string
  created?: string
}

// Inverse map: Nango providerConfigKey → OpsRadar tool slug. Letting us
// turn Nango's listConnections rows back into the slugs the UI uses.
const PROVIDER_TO_SLUG: Record<string, NangoToolSlug> = Object.fromEntries(
  (Object.entries(NANGO_TOOLS) as [NangoToolSlug, string][]).map(
    ([slug, providerKey]) => [providerKey, slug],
  ),
) as Record<string, NangoToolSlug>

export async function GET(): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const nango = getNango()
    const { connections } = (await nango.listConnections({
      tags: { end_user_id: userId },
    } as unknown as Parameters<typeof nango.listConnections>[0])) as unknown as {
      connections: NangoConnectionRow[]
    }

    const out = (connections ?? [])
      .map((c) => {
        const providerKey = c.provider_config_key ?? ''
        const slug = PROVIDER_TO_SLUG[providerKey]
        if (!slug) return null
        return {
          tool_slug: slug,
          connected_at: c.created ?? null,
          is_active: true,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ connections: out })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/nango/connections] listConnections failed:', message)
    return NextResponse.json({ connections: [], error: 'nango_error', message }, { status: 200 })
  }
}
