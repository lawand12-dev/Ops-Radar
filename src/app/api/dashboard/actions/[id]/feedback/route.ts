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
import { tasks } from '@trigger.dev/sdk/v3'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'
import { apprenticeModeEnabled } from '<npm>/lib/flags'
// Type-only — used to give `tasks.trigger` the right payload shape.
import type { learnFromRejection } from '<npm>/trigger/learn-from-rejection'

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
  // rather than a silent no-op. We also pull agent_slug + payload so the
  // CP-35 Apprentice Mode handler has full context when the customer rejects.
  const { data: row, error: fetchErr } = await supabase
    .from('agent_actions')
    .select('id, user_id, agent_slug, payload')
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

  // CP-35 — Apprentice Mode. When the customer rejects (or edits) an action,
  // fire-and-forget a Trigger.dev task that derives a generalizable rule and
  // writes it to that employee's learned-rules in the brain. Gated by the
  // `apprenticeModeEnabled` Statsig flag so we can kill the feature instantly
  // if it generates bad rules.
  //
  // NOTE: not awaited — the customer's feedback save must not slow down
  // because Trigger.dev is slow. The .catch() suppresses the unhandled
  // rejection so a Trigger.dev outage doesn't surface in Sentry as a 500.
  if ((op === 'reject' || op === 'edit') && row.agent_slug) {
    try {
      const flagOn = await apprenticeModeEnabled()
      if (flagOn) {
        void tasks
          .trigger<typeof learnFromRejection>('learn-from-rejection', {
            userId,
            employeeSlug: row.agent_slug,
            actionId: id,
            originalProposal: row.payload,
            rejectionReason: typeof body.reason === 'string' ? body.reason : '',
            edits:
              typeof body.edit_diff === 'string' && body.edit_diff.length > 0
                ? body.edit_diff
                : undefined,
          })
          .catch((err) => {
            console.warn(
              '[actions/feedback] learn-from-rejection trigger failed:',
              err instanceof Error ? err.message : String(err),
            )
          })
      }
    } catch (err) {
      console.warn(
        '[actions/feedback] apprenticeModeEnabled check failed:',
        err instanceof Error ? err.message : String(err),
      )
    }
  }

  return NextResponse.json({ ok: true })
}
