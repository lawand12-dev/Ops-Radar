import { Client as HubspotClient } from '@hubspot/api-client';

function client(token: string): HubspotClient {
  return new HubspotClient({ accessToken: token });
}

export type HubspotSalesData = {
  pipeline_value: number;             // sum of `amount` for all open deals (USD)
  open_deals_count: number;
  new_leads: number;                  // contacts created in last 30 days
  deals_won_this_month: number;       // count of deals closed-won this month
  sparkline: Array<{ date: string; deals_created: number }>; // last 30 days
  currency: 'USD';
};

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

/**
 * Validates a HubSpot Private App Token (or OAuth access token) by calling
 * /integrations/v1/me. Returns the portal id on success.
 */
export async function validateHubspotToken(token: string): Promise<AdapterValidation> {
  try {
    const res = await fetch('https://api.hubapi.com/integrations/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      return { ok: false, reason: 'invalid_key', message: 'The token was rejected by HubSpot.' };
    }
    if (res.status === 403) {
      return { ok: false, reason: 'permission', message: 'The token lacks read permissions for CRM data.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `HubSpot returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { portalId?: number };
    if (!body.portalId) {
      return { ok: false, reason: 'network', message: 'HubSpot response did not include a portal id.' };
    }
    return { ok: true, externalAccountId: String(body.portalId) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not reach HubSpot.';
    return { ok: false, reason: 'network', message };
  }
}

const PAGE_LIMIT = 100;
const OPEN_DEAL_STAGES = new Set([
  'appointmentscheduled', 'qualifiedtobuy', 'presentationscheduled',
  'decisionmakerboughtin', 'contractsent',
]);
const WON_STAGE = 'closedwon';

function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
function daysAgo(now: Date, n: number): Date {
  const d = new Date(now); d.setUTCDate(d.getUTCDate() - n); return d;
}
function dayKey(input: string | Date): string {
  return new Date(input).toISOString().slice(0, 10);
}

/**
 * Live-fetches deals + contacts from HubSpot. No persistence.
 * v1: USD only, 100 results per resource. Deal stages outside the HubSpot
 * default set surface as 0 in pipeline/won buckets — acceptable for v1.
 */
export async function fetchHubspotSalesData(token: string): Promise<HubspotSalesData> {
  const hs = client(token);
  const now = new Date();
  const monthStart = startOfMonthUtc(now);
  const thirtyAgo = daysAgo(now, 30);

  const [dealsResp, contactsResp] = await Promise.all([
    hs.crm.deals.basicApi.getPage(
      PAGE_LIMIT,
      undefined,
      ['amount', 'dealstage', 'createdate', 'closedate'],
      undefined,
      undefined,
      false,
    ),
    hs.crm.contacts.basicApi.getPage(
      PAGE_LIMIT,
      undefined,
      ['createdate', 'email'],
      undefined,
      undefined,
      false,
    ),
  ]);

  let pipelineValue = 0;
  let openDealsCount = 0;
  let dealsWonThisMonth = 0;
  const sparkBuckets: Record<string, number> = {};
  for (let i = 0; i < 30; i++) sparkBuckets[dayKey(daysAgo(now, i))] = 0;

  for (const deal of dealsResp.results) {
    const stage = (deal.properties?.dealstage ?? '').toString();
    const amount = Number(deal.properties?.amount ?? 0) || 0;
    const createIso = deal.properties?.createdate;
    const closeIso = deal.properties?.closedate;
    if (OPEN_DEAL_STAGES.has(stage)) {
      pipelineValue += amount;
      openDealsCount += 1;
    }
    if (stage === WON_STAGE && closeIso && new Date(closeIso) >= monthStart) {
      dealsWonThisMonth += 1;
    }
    if (createIso) {
      const k = dayKey(createIso);
      if (k in sparkBuckets) sparkBuckets[k] += 1;
    }
  }

  let newLeads = 0;
  for (const contact of contactsResp.results) {
    const createIso = contact.properties?.createdate;
    if (createIso && new Date(createIso) >= thirtyAgo) newLeads += 1;
  }

  const sparkline = Object.entries(sparkBuckets)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, deals_created]) => ({ date, deals_created }));

  return {
    pipeline_value: pipelineValue,
    open_deals_count: openDealsCount,
    new_leads: newLeads,
    deals_won_this_month: dealsWonThisMonth,
    sparkline,
    currency: 'USD',
  };
}
