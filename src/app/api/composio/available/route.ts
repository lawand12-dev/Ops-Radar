import { NextRequest, NextResponse } from 'next/server'
import { COMPOSIO_TOOLS, type ToolSlug, getAuthConfigId } from '<npm>/lib/composio'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Returns the list of tool_slugs that have a Composio Auth Config configured
 * on the server. The integrations page uses this to decide whether to offer
 * OAuth or fall back to the legacy "paste API key" Model C flow per tool.
 *
 * Public route — no auth required, no secrets leak (we only return slugs).
 */
export async function GET(_req: NextRequest) {
  const slugs = Object.keys(COMPOSIO_TOOLS) as ToolSlug[]
  const available = slugs.filter((s) => getAuthConfigId(s) !== null)
  return NextResponse.json({ available })
}
