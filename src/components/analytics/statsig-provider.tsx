'use client'

/**
 * StatsigAnalyticsProvider — initializes Statsig's client SDK with
 * web-analytics + session-replay plugins.
 *
 * The server-side flag adapter (src/lib/flags/index.ts) uses Statsig's
 * Node SDK for gating. This component is the parallel client-side
 * surface — it gives us:
 *   - Auto-collected pageviews, web-vitals, and session metadata
 *   - Session-replay for the % of sessions Statsig samples
 *   - Same client-side gates available to client React components if we
 *     ever need them (today we resolve flags server-side, so this layer
 *     is analytics-only).
 *
 * Falls back to rendering children unwrapped if NEXT_PUBLIC_STATSIG_CLIENT_KEY
 * isn't configured — local dev without keys works.
 */

import { ReactNode } from 'react'
import { StatsigProvider, useClientAsyncInit } from '@statsig/react-bindings'
import { StatsigAutoCapturePlugin } from '@statsig/web-analytics'
import { StatsigSessionReplayPlugin } from '@statsig/session-replay'

const SDK_KEY = process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY ?? ''

function BootedStatsig({ children }: { children: ReactNode }) {
  // Anonymous user — we don't have the customer's userId at first paint
  // (auth is a separate Supabase round-trip). Statsig allows updating
  // identity later via client.updateUserAsync() once we wire that.
  const { client } = useClientAsyncInit(
    SDK_KEY,
    { userID: 'anonymous' },
    {
      plugins: [
        new StatsigAutoCapturePlugin(),
        new StatsigSessionReplayPlugin(),
      ],
    },
  )
  return <StatsigProvider client={client}>{children}</StatsigProvider>
}

export function StatsigAnalyticsProvider({ children }: { children: ReactNode }) {
  if (!SDK_KEY) {
    // No client key configured (local dev or first deploy) — render
    // children unwrapped so the app still works. Statsig analytics
    // simply won't fire.
    return <>{children}</>
  }
  return <BootedStatsig>{children}</BootedStatsig>
}
