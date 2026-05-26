/**
 * STUB — Nango wire-up pending (engine demolished 2026-05-26)
 * Wire to Nango when ready.
 * Returns empty data so the dashboard renders without 500-ing.
 * Will be rewritten on Nango per the migration plan.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ stub: true, migration: 'pending-nango-wire-up', data: null })
}

export async function POST() {
  return NextResponse.json({ stub: true, migration: 'pending-nango-wire-up', data: null }, { status: 503 })
}
