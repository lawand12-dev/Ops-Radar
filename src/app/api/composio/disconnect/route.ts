import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { COMPOSIO_TOOLS, type ToolSlug, getComposio } from '<npm>/lib/composio'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_SLUGS = new Set(Object.keys(COMPOSIO_TOOLS) as ToolSlug[])

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const toolSlug = body?.tool_slug
  if (typeof toolSlug !== 'string' || !VALID_SLUGS.has(toolSlug as ToolSlug)) {
    return NextResponse.json(
      { error: 'invalid_tool_slug', message: 'Unknown tool_slug.' },
      { status: 400 },
    )
  }

  const supabase = getServerSupabaseClient()
  const { data: row, error: lookupErr } = await supabase
    .from('composio_connections')
    .select('composio_connection_id')
    .eq('user_id', userId)
    .eq('tool_slug', toolSlug)
    .maybeSingle()

  if (lookupErr) {
    console.error('[composio/disconnect] lookup failed:', lookupErr)
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
  }
  if (!row) {
    return NextResponse.json({ ok: true, already_gone: true })
  }

  // Best-effort revoke at Composio. We still delete the local row even if
  // the upstream call fails — the customer's intent was to disconnect.
  try {
    const composio = getComposio()
    await composio.connectedAccounts.delete(row.composio_connection_id)
  } catch (err) {
    console.warn('[composio/disconnect] upstream revoke failed (continuing):', err)
  }

  const { error: deleteErr } = await supabase
    .from('composio_connections')
    .delete()
    .eq('user_id', userId)
    .eq('tool_slug', toolSlug)

  if (deleteErr) {
    console.error('[composio/disconnect] delete row failed:', deleteErr)
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 })
  }

  // When Notion is disconnected, delete the Brain workspace row too.
  // If the user reconnects Notion (even to a different workspace), provisioning
  // will start fresh and write the correct database UUIDs. Without this cleanup,
  // a reconnect to a different workspace would leave stale UUIDs in the DB,
  // causing all subsequent NOTION_QUERY_DATABASE calls to fail with 404.
  if (toolSlug === 'notion') {
    const { error: wsDeleteErr } = await supabase
      .from('notion_workspaces')
      .delete()
      .eq('user_id', userId)
    if (wsDeleteErr) {
      console.warn('[composio/disconnect] notion_workspaces cleanup failed (non-fatal):', wsDeleteErr)
    }
  }

  return NextResponse.json({ ok: true })
}
