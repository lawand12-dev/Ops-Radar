/**
 * GET /api/dashboard/usage — current month's external-API usage for this
 * customer across all providers, plus their per-tier caps. Used by the
 * /dashboard/settings/usage page.
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { checkQuota } from '<npm>/lib/usage/track'
import { TIER_CAPS, type Provider } from '<npm>/lib/usage/types'
import { getUserTier } from '<npm>/lib/agents/tier-gate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PROVIDERS: Provider[] = ['openai', 'composio', 'tavily', 'anthropic']

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const tier = (await getUserTier(userId)) ?? 'starter'

  const quotas = await Promise.all(
    PROVIDERS.map(async (provider) => {
      const q = await checkQuota({ userId, provider })
      return {
        provider,
        used: q.used,
        cap: q.cap,
        remaining: q.remaining,
        resets_at: q.resetsAt.toISOString(),
        pct_used: q.cap > 0 ? Math.round((q.used / q.cap) * 100) : 0,
      }
    }),
  )

  return NextResponse.json({
    tier,
    tier_caps: TIER_CAPS[tier],
    quotas,
  })
}
