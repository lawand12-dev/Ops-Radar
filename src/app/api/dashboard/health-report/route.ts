import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { isComposioConnected } from '<npm>/lib/composio-fetch'
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

  // Composio-era: report needs at least one of Stripe or Harvest connected.
  const [stripeConnected, harvestConnected] = await Promise.all([
    isComposioConnected(userId, 'stripe'),
    isComposioConnected(userId, 'harvest'),
  ])

  if (!stripeConnected && !harvestConnected) {
    return NextResponse.json({ report: null, reason: 'no_integrations' })
  }

  try {
    const report = await generateHealthReport({
      userId,
      stripeConnected,
      harvestConnected,
      blendedRate,
      companyName,
    })
    return NextResponse.json({ report })
  } catch (err) {
    console.error('[health-report] generation failed:', err)
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 })
  }
}
