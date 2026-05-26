/**
 * STUB — Composio dependency removed 2026-05-26 during Nango migration.
 * Original route logic deleted with the rest of the Composio call sites.
 * Returns empty data so the dashboard renders without 500-ing.
 * Will be rewritten on Nango per the migration plan.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ stub: true, migration: 'composio-to-nango', data: null })
}

export async function POST() {
  return NextResponse.json({ stub: true, migration: 'composio-to-nango', data: null }, { status: 503 })
}
