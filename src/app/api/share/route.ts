/**
 * Audit-share endpoint — RETIRED in CP-16 with the audit funnel.
 *
 * The `audits` table was dropped. Any caller that still POSTs here gets a
 * clear 410 Gone so they know to update.
 */

import { NextResponse } from 'next/server'
import { applyRateLimit } from '<npm>/lib/rate-limit'

export async function POST(request: Request) {
  const rateLimitResponse = await applyRateLimit(request, 'share')
  if (rateLimitResponse) return rateLimitResponse
  return NextResponse.json(
    {
      error: 'gone',
      retired: 'audit-share',
      message: 'The audit funnel has been retired.',
    },
    { status: 410 },
  )
}
