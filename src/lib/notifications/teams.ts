// Microsoft Teams incoming-webhook dispatcher.
// Branch: main / Supabase. The customer's Teams webhook URL lives in
// auth.users.user_metadata.teams_webhook_url (set via /dashboard/settings).
// Failure is silent — Teams outages must never break the calling code path.

import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

const TEAMS_TIMEOUT_MS = 5_000;

/**
 * Teams MessageCard format ("legacy actionable messages") — works with the
 * standard "Incoming Webhook" connector in Teams channels.
 * Newer Power Automate "Workflow" webhooks accept Adaptive Cards; we support
 * the more universal MessageCard for now.
 */
export type TeamsMessage = {
  '@type': 'MessageCard';
  '@context': 'https://schema.org/extensions';
  themeColor?: string;
  summary: string;
  title?: string;
  text?: string;
  sections?: Array<{
    activityTitle?: string;
    activitySubtitle?: string;
    facts?: Array<{ name: string; value: string }>;
    text?: string;
  }>;
  potentialAction?: Array<{
    '@type': 'OpenUri';
    name: string;
    targets: Array<{ os: 'default'; uri: string }>;
  }>;
};

const VALID_PREFIX_RE = /^https:\/\/([a-z0-9-]+\.)?webhook\.office\.com\//;

function isValidTeamsUrl(url: string): boolean {
  return VALID_PREFIX_RE.test(url) || url.startsWith('https://outlook.office.com/webhook/');
}

/**
 * Looks up the Teams webhook URL for the given user. Returns null if not configured.
 */
export async function getTeamsWebhookUrl(userId: string): Promise<string | null> {
  const supabase = getServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const url = meta.teams_webhook_url;
  if (typeof url !== 'string' || !isValidTeamsUrl(url)) return null;
  return url;
}

/**
 * Posts a message to a known Teams webhook URL. Returns true on 2xx, false otherwise.
 * Never throws.
 */
export async function sendToTeamsDirect(
  webhookUrl: string,
  message: TeamsMessage,
): Promise<boolean> {
  if (!isValidTeamsUrl(webhookUrl)) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEAMS_TIMEOUT_MS);

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
    console.warn('[teams] dispatch failed:', err);
    return false;
  }
}

/**
 * Convenience: load + send.
 */
export async function sendToTeams(
  userId: string,
  message: TeamsMessage,
): Promise<boolean> {
  const url = await getTeamsWebhookUrl(userId);
  if (!url) return false;
  return await sendToTeamsDirect(url, message);
}
