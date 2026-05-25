/**
 * GET /api/dashboard/employees/live-token (CP-36).
 *
 * Mints a short-lived Trigger.dev public access token scoped to the current
 * customer's tag (`user:<userId>`). The TeamLiveWidget on /dashboard calls
 * this on mount + every 4 minutes (rotation just before the 5-min expiry)
 * and feeds the token to `useRealtimeRunsWithTag` so the browser can stream
 * run updates directly from Trigger.dev without proxying through our API.
 *
 * Security: the token's scope is fixed to ONLY this customer's tag — we
 * never issue a token without `tags: [\`user:${userId}\`]`, which prevents
 * one customer from reading another's run stream.
 *
 * Auth: requires a logged-in user. Returns 401 otherwise.
 *
 * The `TRIGGER_SECRET_KEY` env var is read by `auth.createPublicToken`
 * automatically via the SDK's global configuration. If it's missing, the
 * SDK call throws and we return 500.
 */

import { NextResponse } from 'next/server'
import { auth } from '@trigger.dev/sdk/v3'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Token lifetime: 5 minutes. The widget rotates on a 4-minute timer so
// there's a 1-minute overlap before the old token expires.
const TOKEN_TTL_MS = 5 * 60 * 1000

export async function GET(): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const token = await auth.createPublicToken({
      scopes: {
        read: {
          // CRITICAL: never issue a token without this tag filter. The
          // dispatcher (src/trigger/dispatch-custom-employees.ts) tags
          // every fan-out subrun with `user:<id>`, so this is the natural
          // per-customer boundary.
          tags: [`user:${userId}`],
        },
      },
      expirationTime: TOKEN_TTL_MS,
    })

    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()
    return NextResponse.json({ token, expires_at: expiresAt })
  } catch (err) {
    console.error('[live-token] Failed to mint Trigger.dev token', err)
    return NextResponse.json(
      { error: 'token_mint_failed' },
      { status: 500 },
    )
  }
}
