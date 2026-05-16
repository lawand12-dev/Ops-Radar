import { createHash } from 'node:crypto';

export type ApolloMarketingData = {
  emails_sent: number;
  open_rate_pct: number;
  reply_rate_pct: number;
  reply_sparkline: number[];
  sequences: Array<{
    id: string;
    name: string;
    contacts_enrolled: number;
    emails_sent: number;
    open_rate_pct: number;
    reply_rate_pct: number;
  }>;
  period_label: string;
};

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

export async function validateApolloKey(apiKey: string): Promise<AdapterValidation> {
  try {
    const res = await fetch('https://api.apollo.io/api/v1/auth/health', {
      headers: { 'X-Api-Key': apiKey, 'Cache-Control': 'no-cache' },
    });
    if (res.status === 401) {
      return { ok: false, reason: 'invalid_key', message: 'The API key was rejected by Apollo.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `Apollo returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { is_logged_in?: boolean };
    if (!body.is_logged_in) {
      return { ok: false, reason: 'invalid_key', message: 'Apollo key is not authenticated.' };
    }
    // Apollo v1 has no /me endpoint — derive a stable ID from the key
    const externalAccountId = createHash('sha256').update(apiKey).digest('hex').substring(0, 24);
    return { ok: true, externalAccountId };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'Could not reach Apollo.',
    };
  }
}

type ApolloCampaign = {
  id: string;
  name: string;
  active_stats?: {
    num_contacts?: number;
    total_sent_emails_count?: number;
    open_rate?: number;
    reply_rate?: number;
  };
};

type ApolloCampaignsResponse = {
  emailer_campaigns: ApolloCampaign[];
  pagination?: { total_entries?: number };
};

export async function fetchApolloMarketingData(apiKey: string): Promise<ApolloMarketingData> {
  const res = await fetch('https://api.apollo.io/api/v1/emailer_campaigns/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({ per_page: 25, status: 'active' }),
  });

  if (!res.ok) {
    throw new Error(`Apollo campaigns fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as ApolloCampaignsResponse;
  const campaigns = data.emailer_campaigns ?? [];

  let totalSent = 0;
  let weightedOpen = 0;
  let weightedReply = 0;

  const sequences = campaigns.map((c) => {
    const sent = c.active_stats?.total_sent_emails_count ?? 0;
    const openRate = (c.active_stats?.open_rate ?? 0) * 100;
    const replyRate = (c.active_stats?.reply_rate ?? 0) * 100;
    totalSent += sent;
    weightedOpen += openRate * sent;
    weightedReply += replyRate * sent;
    return {
      id: c.id,
      name: c.name,
      contacts_enrolled: c.active_stats?.num_contacts ?? 0,
      emails_sent: sent,
      open_rate_pct: Math.round(openRate * 10) / 10,
      reply_rate_pct: Math.round(replyRate * 10) / 10,
    };
  });

  const open_rate_pct =
    totalSent > 0 ? Math.round((weightedOpen / totalSent) * 10) / 10 : 0;
  const reply_rate_pct =
    totalSent > 0 ? Math.round((weightedReply / totalSent) * 10) / 10 : 0;

  return {
    emails_sent: totalSent,
    open_rate_pct,
    reply_rate_pct,
    reply_sparkline: [],
    sequences,
    period_label: 'Active sequences',
  };
}
