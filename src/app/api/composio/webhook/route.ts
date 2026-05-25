import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { refreshCapabilitiesForUser } from '<npm>/lib/composio/capability-cache'
import { provisionBrainFromComposio } from '<npm>/lib/notion/provision'
import { backfillHistory } from '<npm>/lib/warehouse/backfill'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Composio connection webhook endpoint.
 *
 * Composio fires events on `connection.created`, `connection.failed`,
 * `connection.deleted`. We use these to flip `is_active` and timestamps
 * on the composio_connections row that POST /api/composio/connect inserted.
 *
 * Signature verification follows the Composio v3 spec (same as the trigger
 * webhook at /api/automations/webhook/composio):
 *   Headers: webhook-id, webhook-timestamp, webhook-signature
 *   Signed payload: `{webhook-id}.{webhook-timestamp}.{raw-body}`
 *   Digest: HMAC-SHA256 → base64
 *   Replay window: 300 seconds
 * If COMPOSIO_WEBHOOK_SECRET is unset, we warn and accept (dev only).
 */

type ComposioWebhookEvent = {
  event?: string                // e.g. 'connection.created'
  type?: string                 // some payloads use 'type' instead of 'event'
  data?: {
    id?: string
    connectedAccountId?: string
    userId?: string
    appName?: string
    status?: string
  }
  // Some payloads ship fields at the top level
  connectedAccountId?: string
  userId?: string
  appName?: string
}

const REPLAY_WINDOW_SECONDS = 300

async function verifySignature(
  webhookId: string,
  timestamp: string,
  signature: string,
  rawBody: string,
): Promise<boolean> {
  const secret = (process.env.COMPOSIO_WEBHOOK_SECRET ?? '').trim()
  if (!secret) {
    console.warn('[composio/webhook] COMPOSIO_WEBHOOK_SECRET not set — accepting unauthenticated webhook')
    return true
  }
  if (!webhookId || !timestamp || !signature) return false

  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return false
  const ageSec = Math.abs(Date.now() / 1000 - ts)
  if (ageSec > REPLAY_WINDOW_SECONDS) {
    console.warn('[composio/webhook] timestamp outside replay window', { ageSec })
    return false
  }

  const crypto = await import('node:crypto')
  const signedPayload = `${webhookId}.${timestamp}.${rawBody}`
  const expected = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('base64')

  // Composio sends `v1,<sig>` style; tolerate either form.
  const candidate = signature.includes(',') ? signature.split(',').pop()! : signature
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(candidate, 'utf8'))
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

  let payload: ComposioWebhookEvent
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const eventName = payload.event ?? payload.type ?? ''
  const connectionId = payload.data?.connectedAccountId ?? payload.data?.id ?? payload.connectedAccountId
  if (!connectionId) {
    console.warn('[composio/webhook] missing connection id', payload)
    return NextResponse.json({ ok: true, skipped: 'no_connection_id' })
  }

  const supabase = getServerSupabaseClient()

  if (eventName.includes('created') || payload.data?.status === 'ACTIVE') {
    const { data: conn, error } = await supabase
      .from('composio_connections')
      .update({ is_active: true, connected_at: new Date().toISOString() })
      .eq('composio_connection_id', connectionId)
      .select('user_id, tool_slug')
      .maybeSingle()
    if (error) {
      console.error('[composio/webhook] activate failed:', error)
      return NextResponse.json({ error: 'persist_failed' }, { status: 500 })
    }
    if (conn?.user_id && conn?.tool_slug) {
      // Populate capability cache so propose_automation has fresh triggers/actions.
      refreshCapabilitiesForUser(conn.user_id, [conn.tool_slug]).catch((err) =>
        console.warn('[composio/webhook] capability refresh failed:', err),
      )

      // When Notion connects: provision the Brain in the background.
      // Brain creation takes ~30s (20 sequential Notion API calls); fire-and-forget
      // so the webhook response returns immediately and Composio doesn't retry.
      if (conn.tool_slug === 'notion') {
        provisionBrainFromComposio(conn.user_id, connectionId).catch((err) =>
          console.error(
            '[composio/webhook] Brain provision failed:',
            err instanceof Error ? err.message : err,
          ),
        )

        // CP-31 — also kick off the 12-month historical backfill across
        // every connected toolkit. Fire-and-forget so the webhook returns
        // immediately. Takes ~3-5 min total in parallel across sources.
        backfillHistory(conn.user_id).catch((err) =>
          console.error(
            '[composio/webhook] Historical backfill failed:',
            err instanceof Error ? err.message : err,
          ),
        )
      }
    }
  } else if (eventName.includes('failed') || eventName.includes('deleted')) {
    const { error } = await supabase
      .from('composio_connections')
      .update({ is_active: false })
      .eq('composio_connection_id', connectionId)
    if (error) {
      console.error('[composio/webhook] deactivate failed:', error)
      return NextResponse.json({ error: 'persist_failed' }, { status: 500 })
    }
  } else {
    console.log('[composio/webhook] ignoring event', eventName)
  }

  return NextResponse.json({ ok: true })
}
