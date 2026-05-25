/**
 * Daily brain → Notion sync cron (CP-29).
 *
 * Walks every customer with a provisioned Notion workspace and renders
 * their authoritative brain (brain_documents) into a "OpsRadar Brain
 * (synced)" subtree of their Notion. The customer's existing brain
 * databases (Clients, Risk Register, etc.) are NOT touched.
 *
 * Schedule: 1pm UTC daily — after the morning agent crons have written
 * fresh entries to brain_documents.
 *
 * Auth: CRON_SECRET via Authorization header (Vercel cron).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { syncBrainToNotion } from '<npm>/lib/brain/sync-to-notion'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${(process.env.CRON_SECRET ?? '').trim()}`
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServerSupabaseClient()
  const { data: workspaces, error } = await supabase
    .from('notion_workspaces')
    .select('user_id')
    .neq('backfill_status', 'failed')

  if (error) {
    console.error('[brain-sync] list workspaces failed:', error.message)
    return NextResponse.json({ error: 'list_failed' }, { status: 500 })
  }

  const results: Array<{
    user_id: string
    status: string
    reason?: string
    created?: number
    updated?: number
    skipped?: number
  }> = []

  for (const ws of workspaces ?? []) {
    const userId = ws.user_id as string
    try {
      const r = await syncBrainToNotion(userId)
      results.push({
        user_id: userId,
        status: r.status,
        reason: r.reason,
        created: r.pagesCreated,
        updated: r.pagesUpdated,
        skipped: r.pagesSkipped,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[brain-sync] sync threw for', userId, message)
      results.push({ user_id: userId, status: 'failed', reason: message.slice(0, 200) })
    }
  }

  const succeeded = results.filter((r) => r.status === 'succeeded').length
  return NextResponse.json({
    ok: true,
    processed: results.length,
    succeeded,
    failed: results.length - succeeded,
    detail: results,
  })
}
