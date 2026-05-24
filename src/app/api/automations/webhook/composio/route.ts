/**
 * Composio trigger webhook ingress (CP-20).
 *
 * Composio fires here on every active trigger event (e.g. HUBSPOT_DEAL_STAGE_UPDATED).
 * We:
 *   1. Verify the HMAC-SHA256 signature (Composio v3 spec).
 *   2. Dedupe by webhook-id (Composio retries on non-2xx).
 *   3. Resolve which automations match this trigger via the trigger instances map.
 *   4. Execute each matching automation through the synchronous executor.
 *
 * Webhook spec: https://docs.composio.dev/docs/webhook-verification
 *   Signature string: `{webhook-id}.{webhook-timestamp}.{raw-body}` → HMAC-SHA256 → base64
 *   300-second replay window
 *   Payload: top-level `metadata.trigger_slug`, `metadata.log_id`,
 *            `metadata.connected_account_id`, plus `data` blob.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { executeAutomation } from '<npm>/lib/automations/execute'
import type { CustomerAutomation } from '<npm>/lib/automations/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REPLAY_WINDOW_SECONDS = 300

type ComposioTriggerPayload = {
  metadata?: {
    trigger_slug?: string
    log_id?: string
    connected_account_id?: string
    user_id?: string
    toolkit?: string
  }
  data?: Record<string, unknown>
}

async function verifySignature(
  webhookId: string,
  timestamp: string,
  signature: string,
  rawBody: string,
): Promise<boolean> {
  const secret = (process.env.COMPOSIO_WEBHOOK_SECRET ?? '').trim()
  if (!secret) {
    console.warn(
      '[automations/webhook] COMPOSIO_WEBHOOK_SECRET not set — accepting unverified webhook (dev only)',
    )
    return true
  }
  if (!webhookId || !timestamp || !signature) return false

  // Replay protection
  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return false
  const ageSec = Math.abs(Date.now() / 1000 - ts)
  if (ageSec > REPLAY_WINDOW_SECONDS) {
    console.warn('[automations/webhook] timestamp outside replay window', { ageSec })
    return false
  }

  const crypto = await import('node:crypto')
  const signedPayload = `${webhookId}.${timestamp}.${rawBody}`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('base64')

  // Composio sends `v1,<sig>` style; tolerate either form.
  const candidate = signature.includes(',') ? signature.split(',').pop()! : signature
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(candidate, 'utf8'),
    )
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const webhookId = req.headers.get('webhook-id') ?? ''
  const timestamp = req.headers.get('webhook-timestamp') ?? ''
  const signature = req.headers.get('webhook-signature') ?? ''

  const ok = await verifySignature(webhookId, timestamp, signature, raw)
  if (!ok) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let payload: ComposioTriggerPayload
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const triggerSlug = payload.metadata?.trigger_slug
  const connectedAccountId = payload.metadata?.connected_account_id
  if (!triggerSlug || !connectedAccountId) {
    console.warn('[automations/webhook] missing trigger_slug or connected_account_id')
    return NextResponse.json({ ok: true, skipped: 'missing_metadata' })
  }

  const supabase = getServerSupabaseClient()

  // Dedupe: if we've already processed this webhook-id, no-op.
  if (webhookId) {
    const { data: existing } = await supabase
      .from('automation_event_idempotency')
      .select('webhook_id')
      .eq('webhook_id', webhookId)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ ok: true, deduped: true })
    }
  }

  // Resolve which automations fire on this trigger via the trigger instances map.
  const { data: instances, error: instErr } = await supabase
    .from('automation_trigger_instances')
    .select('automation_id, user_id')
    .eq('connected_account_id', connectedAccountId)
    .eq('trigger_slug', triggerSlug)
    .eq('is_active', true)
  if (instErr) {
    console.error('[automations/webhook] trigger instance lookup failed:', instErr.message)
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
  }

  const automationIds = (instances ?? []).map((r) => r.automation_id as string)
  if (automationIds.length === 0) {
    // No matching automation — record idempotency anyway so retries don't keep looking.
    if (webhookId) {
      await supabase.from('automation_event_idempotency').insert({
        webhook_id: webhookId,
        automation_ids: [],
      })
    }
    return NextResponse.json({ ok: true, fired: 0 })
  }

  const { data: automations, error: aErr } = await supabase
    .from('customer_automations')
    .select('*')
    .in('id', automationIds)
    .eq('status', 'active')
  if (aErr) {
    console.error('[automations/webhook] automation load failed:', aErr.message)
    return NextResponse.json({ error: 'load_failed' }, { status: 500 })
  }

  const matchedAutomations = (automations ?? []) as unknown as CustomerAutomation[]

  // Record idempotency BEFORE executing so retries don't double-fire.
  if (webhookId) {
    await supabase.from('automation_event_idempotency').insert({
      webhook_id: webhookId,
      automation_ids: matchedAutomations.map((a) => a.id),
    })
  }

  // Execute each in parallel. Each invocation creates its own automation_runs row.
  const results = await Promise.allSettled(
    matchedAutomations.map((a) =>
      executeAutomation({
        automation: a,
        triggerEvent: payload as unknown as Record<string, unknown>,
        source: 'webhook',
      }),
    ),
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({
    ok: true,
    fired: matchedAutomations.length,
    succeeded,
    failed,
  })
}
