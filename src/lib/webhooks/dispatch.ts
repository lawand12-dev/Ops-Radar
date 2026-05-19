// Outgoing webhook dispatcher.
// Branch: main / Supabase. Delivers signed event payloads to customer-registered URLs.
// HMAC-SHA256 signing using the per-webhook signing_secret. Customers verify with:
//   const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
//   if (computed !== request.headers['x-opsradar-signature']) reject

import { createHmac, randomBytes } from 'node:crypto';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

const WEBHOOK_TIMEOUT_MS = 5_000;

export type OpsRadarEventType =
  | 'action.created'
  | 'action.executed'
  | 'alert.threshold_crossed'
  | 'briefing.ready'
  | 'retainer.overage_detected'
  | 'scope.at_risk';

export const ALL_EVENT_TYPES: OpsRadarEventType[] = [
  'action.created',
  'action.executed',
  'alert.threshold_crossed',
  'briefing.ready',
  'retainer.overage_detected',
  'scope.at_risk',
];

export type WebhookPayload = {
  event: OpsRadarEventType;
  occurred_at: string; // ISO
  data: Record<string, unknown>;
};

export function generateSigningSecret(): string {
  return `whsec_${randomBytes(32).toString('hex')}`;
}

export function signPayload(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * Dispatches a single event to all of a user's matching active webhooks.
 * Each delivery is recorded in webhook_deliveries (whether success or failure).
 * Never throws — webhook outages must not break the calling code path.
 */
export async function dispatchEvent(
  userId: string,
  event: OpsRadarEventType,
  data: Record<string, unknown>,
): Promise<{ delivered: number; failed: number; skipped: number }> {
  const stats = { delivered: 0, failed: 0, skipped: 0 };
  const supabase = getServerSupabaseClient();

  const { data: webhooks, error } = await supabase
    .from('outgoing_webhooks')
    .select('id, url, events, signing_secret')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('[webhooks/dispatch] lookup failed:', error.message);
    return stats;
  }

  if (!webhooks || webhooks.length === 0) {
    return stats;
  }

  const payload: WebhookPayload = {
    event,
    occurred_at: new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(payload);

  for (const wh of webhooks) {
    const events = (wh.events ?? []) as string[];
    // Empty events array means "all events" (convention).
    if (events.length > 0 && !events.includes(event)) {
      stats.skipped++;
      continue;
    }

    const signature = signPayload(wh.signing_secret as string, body);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    let responseStatus: number | null = null;
    let responseBody = '';
    let delivered = false;

    try {
      const res = await fetch(wh.url as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OpsRadar-Webhook/1.0',
          'X-OpsRadar-Event': event,
          'X-OpsRadar-Signature': signature,
        },
        body,
        signal: controller.signal,
      });
      responseStatus = res.status;
      delivered = res.ok;
      try {
        responseBody = (await res.text()).slice(0, 500);
      } catch {
        // body read failure — keep empty
      }
    } catch (err) {
      console.warn('[webhooks/dispatch] delivery failed:', err);
    } finally {
      clearTimeout(timer);
    }

    await supabase.from('webhook_deliveries').insert({
      webhook_id: wh.id as string,
      user_id: userId,
      event_type: event,
      payload: payload as unknown as import('<npm>/lib/database.types').Json,
      status: delivered ? 'delivered' : 'failed',
      response_status: responseStatus,
      response_body: responseBody || null,
      attempts: 1,
      delivered_at: delivered ? new Date().toISOString() : null,
    });

    if (delivered) stats.delivered++;
    else stats.failed++;
  }

  return stats;
}
