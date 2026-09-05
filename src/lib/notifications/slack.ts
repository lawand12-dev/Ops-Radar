// Slack incoming-webhook dispatcher.
// Branch: main / Supabase. The customer's Slack webhook URL lives in
// auth.users.user_metadata.slack_webhook_url (set via /dashboard/settings).
// Failure is silent — Slack outages must never break the calling code path.

import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

const SLACK_TIMEOUT_MS = 5_000;

export type SlackBlock =
  | { type: 'header'; text: { type: 'plain_text'; text: string; emoji?: boolean } }
  | { type: 'section'; text: { type: 'mrkdwn'; text: string }; fields?: Array<{ type: 'mrkdwn'; text: string }> }
  | { type: 'divider' }
  | { type: 'context'; elements: Array<{ type: 'mrkdwn'; text: string }> }
  | { type: 'actions'; elements: Array<{ type: 'button'; text: { type: 'plain_text'; text: string }; url: string; style?: 'primary' | 'danger' }> };

export type SlackMessage = {
  text: string; // fallback for notifications
  blocks?: SlackBlock[];
};

/**
 * Looks up the Slack webhook URL for the given user.
 * Returns null if not configured — caller treats Slack as optional.
 */
export async function getSlackWebhookUrl(userId: string): Promise<string | null> {
  const supabase = getServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const url = meta.slack_webhook_url;
  if (typeof url !== 'string' || !url.startsWith('https://hooks.slack.com/')) {
    return null;
  }
  return url;
}

/**
 * Sends a message to the user's Slack via their configured webhook URL.
 * Returns true on success, false on any failure (timeout, network, non-2xx).
 * Never throws.
 */
export async function sendToSlack(
  userId: string,
  message: SlackMessage,
): Promise<boolean> {
  const url = await getSlackWebhookUrl(userId);
  if (!url) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn('[slack] non-2xx for user', userId, ':', res.status);
      return false;
    }
    return true;
  } catch (err) {
    clearTimeout(timer);
    console.warn('[slack] dispatch failed for user', userId, ':', err);
    return false;
  }
}

/**
 * Convenience: post a Slack message using a webhook URL already in hand
 * (avoids the Supabase lookup). Used by callers that already loaded the URL.
 */
export async function sendToSlackDirect(
  webhookUrl: string,
  message: SlackMessage,
): Promise<boolean> {
  if (!webhookUrl.startsWith('https://hooks.slack.com/')) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch (err) {
    clearTimeout(timer);
    console.warn('[slack] direct dispatch failed:', err);
    return false;
  }
}
