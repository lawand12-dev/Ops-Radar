import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Composio webhook endpoint.
 *
 * Composio fires events on `connection.created`, `connection.failed`,
 * `connection.deleted`. We use these to flip `is_active` and timestamps
 * on the composio_connections row that POST /api/composio/connect inserted.
 *
 * Signature verification is enforced when COMPOSIO_WEBHOOK_SECRET is set
 * (Composio sends an HMAC-SHA256 of the raw body in `X-Composio-Signature`).
 * If the secret is unset, we log a warning and accept the payload — this
 * lets local dev work without webhook auth, but production must set it.
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

async function verifySignature(req: NextRequest, raw: string): Promise<boolean> {
  const secret = (process.env.COMPOSIO_WEBHOOK_SECRET ?? '').trim()
  if (!secret) {
    console.warn('[composio/webhook] COMPOSIO_WEBHOOK_SECRET not set — accepting unauthenticated webhook')
    return true
  }
  const sig =
    req.headers.get('x-composio-signature') ??
    req.headers.get('X-Composio-Signature') ??
    ''
  if (!sig) return false

  const crypto = await import('node:crypto')
  const expected = crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(sig, 'utf8'))
}

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const ok = await verifySignature(req, raw)
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
    const { error } = await supabase
      .from('composio_connections')
      .update({ is_active: true, connected_at: new Date().toISOString() })
      .eq('composio_connection_id', connectionId)
    if (error) {
      console.error('[composio/webhook] activate failed:', error)
      return NextResponse.json({ error: 'persist_failed' }, { status: 500 })
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
