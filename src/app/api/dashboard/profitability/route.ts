/**
 * STUB — integration wire-up pending (engine demolished 2026-05-26)
 * Wire to the integration layer when ready.
 * Returns empty data so the dashboard renders without 500-ing.
 * Will be rewritten when the integration layer returns.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ stub: true, migration: 'pending-integration-wire-up', data: null })
}

export async function POST() {
  return NextResponse.json({ stub: true, migration: 'pending-integration-wire-up', data: null }, { status: 503 })
}
