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
  truncated: boolean;                 // true if either deals or contacts response had a next page
};

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

function statusOf(e: unknown): number | null {
  const x = e as {
    code?: number;
    statusCode?: number;
    status?: number;
    response?: { statusCode?: number };
  };
  return x?.code ?? x?.statusCode ?? x?.status ?? x?.response?.statusCode ?? null;
}

/**
 * Validates a HubSpot Private App Token (or OAuth access token) by calling
 * /integrations/v1/me. Returns the portal id on success.
 *
 * After /me succeeds, performs probe reads against deals and contacts to
 * prove the token actually has CRM read scopes. Tokens with zero CRM scopes
 * pass /me but fail the probes — we want to surface that to the connect UI,
 * not to the dashboard widget.
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

    // Probe both CRM read scopes. A token without crm.objects.deals.read or
    // crm.objects.contacts.read will pass /me but throw here.
    const hs = client(token);
    try {
      await Promise.all([
        hs.crm.deals.basicApi.getPage(1, undefined, undefined, undefined, undefined, false),
        hs.crm.contacts.basicApi.getPage(1, undefined, undefined, undefined, undefined, false),
      ]);
    } catch (err: unknown) {
      const status = statusOf(err);
      if (status === 401) {
        return { ok: false, reason: 'invalid_key', message: 'The token was rejected by HubSpot.' };
      }
      if (status === 403) {
        return {
          ok: false,
          reason: 'permission',
          message: 'The token lacks crm.objects.deals.read or crm.objects.contacts.read scope.',
        };
      }
      const message = err instanceof Error ? err.message : 'Could not reach HubSpot.';
      return { ok: false, reason: 'network', message };
    }

    return { ok: true, externalAccountId: String(body.portalId) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not reach HubSpot.';
    return { ok: false, reason: 'network', message };
  }
}

const PAGE_LIMIT = 100;

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
 *
 * v1: USD only, 100 results per resource. Uses HubSpot's portable system
 * properties (`hs_is_closed`, `hs_is_closed_won`) so custom pipelines work
 * out of the box — no hardcoded stage IDs. If either response has a next
 * page, `truncated` is set to true so the UI can show a disclaimer.
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
      ['amount', 'dealstage', 'createdate', 'closedate', 'hs_is_closed', 'hs_is_closed_won'],
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
    const amount = Number(deal.properties?.amount ?? 0) || 0;
    const createIso = deal.properties?.createdate;
    const closeIso = deal.properties?.closedate;
    const isClosed = (deal.properties?.hs_is_closed ?? '').toString() === 'true';
    const isClosedWon = (deal.properties?.hs_is_closed_won ?? '').toString() === 'true';

    if (!isClosed) {
      pipelineValue += amount;
      openDealsCount += 1;
    }
    if (isClosedWon && closeIso && new Date(closeIso) >= monthStart) {
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

  const dealsHasNext = typeof dealsResp.paging?.next?.after === 'string' && dealsResp.paging.next.after.length > 0;
  const contactsHasNext = typeof contactsResp.paging?.next?.after === 'string' && contactsResp.paging.next.after.length > 0;
  const truncated = dealsHasNext || contactsHasNext;

  return {
    pipeline_value: pipelineValue,
    open_deals_count: openDealsCount,
    new_leads: newLeads,
    deals_won_this_month: dealsWonThisMonth,
    sparkline,
    currency: 'USD',
    truncated,
  };
}
