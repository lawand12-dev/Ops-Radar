/**
 * STUB — integration wire-up pending (engine demolished 2026-05-26)
 */
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET() {
  return NextResponse.json({ stub: true, migration: 'pending-integration-wire-up', data: null })
}
