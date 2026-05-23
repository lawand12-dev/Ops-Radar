import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ComposioConnection = {
  tool_slug: string
  connected_at: string
  is_active: boolean
  last_used_at: string | null
}

export async function GET(_req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('composio_connections')
    .select('tool_slug, connected_at, is_active, last_used_at')
    .eq('user_id', userId)

  if (error) {
    console.error('[composio/connections] list failed:', error)
    return NextResponse.json({ error: 'list_failed' }, { status: 500 })
  }

  const connections: ComposioConnection[] = (data ?? []).map((row) => ({
    tool_slug: row.tool_slug,
    connected_at: row.connected_at,
    is_active: row.is_active,
    last_used_at: row.last_used_at,
  }))

  return NextResponse.json({ connections })
}
