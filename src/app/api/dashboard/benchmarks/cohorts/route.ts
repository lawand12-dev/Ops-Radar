/**
 * STUB — Composio dependency removed 2026-05-26 during Nango migration.
 */
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET() {
  return NextResponse.json({ stub: true, migration: 'composio-to-nango', data: null })
}
