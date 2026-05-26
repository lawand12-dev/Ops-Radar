/**
 * STUB — Composio dependency removed 2026-05-26 during Nango migration.
 * Employee chat will be rebuilt on Nango.
 */
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function POST() {
  return NextResponse.json({ stub: true, migration: 'composio-to-nango', error: 'employee_chat_offline_during_migration' }, { status: 503 })
}
