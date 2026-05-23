import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { AGENTS } from '<npm>/lib/agents/registry'
import type { AgentSlug } from '<npm>/lib/agents/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  if (!(slug in AGENTS)) {
    return NextResponse.json({ error: 'unknown_agent' }, { status: 404 })
  }
  const agentSlug = slug as AgentSlug

  const body = await req.json().catch(() => null)
  const isEnabled = body?.is_enabled
  if (typeof isEnabled !== 'boolean') {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Expected { is_enabled: boolean }.' },
      { status: 400 },
    )
  }

  const supabase = getServerSupabaseClient()
  const { error } = await supabase.from('agent_config').upsert(
    {
      user_id: userId,
      agent_slug: agentSlug,
      is_enabled: isEnabled,
    },
    { onConflict: 'user_id,agent_slug' },
  )

  if (error) {
    console.error('[agents/toggle] upsert failed:', error)
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, is_enabled: isEnabled })
}
