/**
 * Approval-feedback endpoint for queued agent actions.
 *
 * The Actions queue UI calls this whenever a customer approves, rejects, or
 * edits a draft. The columns we update become the signal we feed back into
 * each agent's next run via `getApprovalPatterns` — closing the
 * personalization loop.
 *
 * POST body shape:
 *   { action: 'approve' | 'reject' | 'edit', reason?: string, edit_diff?: string }
 *
 * Returns `{ ok: true }` on success.
 *
 * Note: this is intentionally narrower than the existing PATCH on the parent
 * actions route (which also runs the executor + logs outcomes). This route is
 * purely about capturing the feedback signal — the queue UI calls *both*
 * endpoints when relevant.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type FeedbackBody = {
  action?: string
  reason?: string
  edit_diff?: string
}

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 })
  }

  let body: FeedbackBody
  try {
    body = (await request.json()) as FeedbackBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const op = body.action
  if (op !== 'approve' && op !== 'reject' && op !== 'edit') {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  }

  const supabase = await getSessionSupabaseClient()

  // Verify the row exists AND belongs to this user. Even though RLS should
  // already scope this, we do an explicit check so a missing row returns 404
  // rather than a silent no-op.
  const { data: row, error: fetchErr } = await supabase
    .from('agent_actions')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
  if (!row || row.user_id !== userId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const now = new Date().toISOString()

  type Update = {
    approved_at?: string | null
    rejected_at?: string | null
    edited_at?: string | null
    feedback_reason?: string | null
    edit_diff?: string | null
  }
  let update: Update

  if (op === 'approve') {
    update = { approved_at: now, rejected_at: null }
  } else if (op === 'reject') {
    update = {
      rejected_at: now,
      feedback_reason:
        typeof body.reason === 'string' && body.reason.length > 0
          ? body.reason
          : null,
    }
  } else {
    update = {
      edited_at: now,
      edit_diff:
        typeof body.edit_diff === 'string' && body.edit_diff.length > 0
          ? body.edit_diff
          : null,
    }
  }

  const { error: updateErr } = await supabase
    .from('agent_actions')
    .update(update)
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
