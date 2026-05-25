/**
 * POST /api/dashboard/backfill/trigger (CP-31).
 *
 * Manual backfill trigger — lets the customer (or admin) re-run the
 * 12-month historical pull on demand. Useful if the auto-trigger from
 * the Notion connect webhook missed, or if the customer connected
 * additional toolkits AFTER initial Notion connect.
 *
 * Synchronous version of backfillHistory — returns the per-source
 * summary so the customer can see what landed. Bounded to 300s by
 * Vercel's function timeout.
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { backfillHistory } from '<npm>/lib/warehouse/backfill'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST() {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const summary = await backfillHistory(userId)
  return NextResponse.json(summary)
}
