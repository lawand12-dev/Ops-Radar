import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { COMPOSIO_TOOLS, type ToolSlug, getAuthConfigId } from '<npm>/lib/composio'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_SLUGS = new Set(Object.keys(COMPOSIO_TOOLS) as ToolSlug[])

function isValidSlug(value: unknown): value is ToolSlug {
  return typeof value === 'string' && VALID_SLUGS.has(value as ToolSlug)
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const toolSlug = body?.tool_slug
  if (!isValidSlug(toolSlug)) {
    return NextResponse.json(
      { error: 'invalid_tool_slug', message: 'Unknown tool_slug.' },
      { status: 400 },
    )
  }

  const authConfigId = getAuthConfigId(toolSlug)
  if (!authConfigId) {
    return NextResponse.json(
      {
        error: 'auth_config_missing',
        message: `Composio Auth Config not configured for ${toolSlug}. The OpsRadar team needs to set this up before customers can connect this tool.`,
      },
      { status: 503 },
    )
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
  const redirectUri = `${appUrl}/dashboard/integrations?connected=${toolSlug}`

  const apiKey = (process.env.COMPOSIO_API_KEY ?? '').trim()
  if (!apiKey) {
    return NextResponse.json({ error: 'composio_not_configured' }, { status: 503 })
  }

  let connectionId: string
  let oauthUrl: string
  try {
    const res = await fetch('https://backend.composio.tech/api/v3/connected_accounts/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        auth_config_id: authConfigId,
        entity_id: userId,
        redirect_uri: redirectUri,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('[composio/connect] link failed:', data)
      return NextResponse.json(
        { error: 'initiate_failed', message: data?.error?.message ?? 'Failed to start OAuth.' },
        { status: 502 },
      )
    }

    connectionId = data.id ?? data.connected_account_id ?? data.connectionId
    oauthUrl = data.redirect_url ?? data.redirectUrl ?? data.oauth_url
  } catch (err) {
    console.error('[composio/connect] link request failed:', err)
    return NextResponse.json(
      { error: 'initiate_failed', message: err instanceof Error ? err.message : 'Failed to start OAuth.' },
      { status: 502 },
    )
  }

  const supabase = getServerSupabaseClient()
  const { error: upsertErr } = await supabase.from('composio_connections').upsert(
    {
      user_id: userId,
      tool_slug: toolSlug,
      composio_connection_id: connectionId,
      is_active: false,
    },
    { onConflict: 'user_id,tool_slug' },
  )

  if (upsertErr) {
    console.error('[composio/connect] supabase upsert failed:', upsertErr)
    return NextResponse.json(
      { error: 'persist_failed', message: 'Could not persist pending connection.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    oauth_url: oauthUrl,
    connection_id: connectionId,
  })
}
