import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { decryptApiKey } from '<npm>/lib/integrations/crypto'
import { generateHealthReport } from '<npm>/lib/health-report'
import { applyRateLimit } from '<npm>/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await applyRateLimit(request, 'dashboard-health-report', userId)
  if (limited) return limited as NextResponse

  const service = getServerSupabaseClient()
  const { data: { user }, error: userErr } = await service.auth.admin.getUserById(userId)
  if (userErr || !user) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
    ? meta.blended_hourly_rate_usd
    : 85
  const companyName = typeof meta.company_name === 'string' ? meta.company_name : ''

  const { data: keyRows, error: keyErr } = await service
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('status', 'connected')

  if (keyErr) {
    console.error('[health-report] integrations read failed:', keyErr)
    return NextResponse.json({ error: 'integrations_read_failed' }, { status: 500 })
  }

  const getKey = (tool: string): string | null => {
    const row = (keyRows ?? []).find((r) => r.tool === tool)
    try { return row ? decryptApiKey(row) : null } catch { return null }
  }

  const stripeApiKey = getKey('stripe')
  const harvestApiKey = getKey('harvest')

  if (!stripeApiKey && !harvestApiKey) {
    return NextResponse.json({ report: null, reason: 'no_integrations' })
  }

  try {
    const report = await generateHealthReport({ stripeApiKey, harvestApiKey, blendedRate, companyName })
    return NextResponse.json({ report })
  } catch (err) {
    console.error('[health-report] generation failed:', err)
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 })
  }
}
