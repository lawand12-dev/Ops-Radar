import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import {
  safeExecuteComposioAction,
  ComposioExecuteError,
} from '<npm>/lib/composio-fetch';
import type { HubspotSalesData } from '<npm>/lib/integration-types';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:sales-live:${userId}`;

type SalesLiveResponse =
  | { status: 'ok'; data: HubspotSalesData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'requires_reconnect' }
  | { status: 'unavailable'; message: string };

/**
 * Shape returned by HUBSPOT_LIST_DEALS via Composio. HubSpot's API returns
 * `results: HubspotDeal[]` with `properties` as a flat dict — Composio preserves
 * the upstream JSON shape verbatim.
 */
type HubspotDealsResponse = {
  results?: Array<{
    id: string;
    properties?: {
      amount?: string | null;
      dealname?: string | null;
      dealstage?: string | null;
      createdate?: string | null;
      closedate?: string | null;
      hs_is_closed?: string | null;
      hs_is_closed_won?: string | null;
    };
  }>;
  paging?: { next?: { after?: string } };
};

type HubspotContactsResponse = {
  results?: Array<{
    id: string;
    properties?: {
      createdate?: string | null;
      email?: string | null;
    };
  }>;
  paging?: { next?: { after?: string } };
};

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
 * Shape Composio HubSpot responses into HubspotSalesData. Mirrors the logic
 * previously in `fetchHubspotSalesData()` — but consuming the raw deals/contacts
 * payloads Composio returns, since we no longer have a typed @hubspot/api-client
 * call site here.
 */
function shapeHubspotSalesData(
  dealsResp: HubspotDealsResponse | null,
  contactsResp: HubspotContactsResponse | null,
): HubspotSalesData {
  const now = new Date();
  const monthStart = startOfMonthUtc(now);
  const thirtyAgo = daysAgo(now, 30);

  let pipelineValue = 0;
  let openDealsCount = 0;
  let dealsWonThisMonth = 0;
  const recentWon: HubspotSalesData['recent_deals_won'] = [];
  const sparkBuckets: Record<string, number> = {};
  for (let i = 0; i < 30; i++) sparkBuckets[dayKey(daysAgo(now, i))] = 0;

  const deals = dealsResp?.results ?? [];
  for (const deal of deals) {
    const amount = Number(deal.properties?.amount ?? 0) || 0;
    const createIso = deal.properties?.createdate ?? null;
    const closeIso = deal.properties?.closedate ?? null;
    const isClosed = (deal.properties?.hs_is_closed ?? '').toString() === 'true';
    const isClosedWon = (deal.properties?.hs_is_closed_won ?? '').toString() === 'true';

    if (!isClosed) {
      pipelineValue += amount;
      openDealsCount += 1;
    }
    if (isClosedWon && closeIso && new Date(closeIso) >= monthStart) {
      dealsWonThisMonth += 1;
    }
    if (isClosedWon && closeIso && new Date(closeIso) >= thirtyAgo) {
      recentWon.push({
        id: deal.id,
        name: deal.properties?.dealname ?? 'Untitled deal',
        amount,
        closed_at: new Date(closeIso).toISOString(),
      });
    }
    if (createIso) {
      const k = dayKey(createIso);
      if (k in sparkBuckets) sparkBuckets[k] += 1;
    }
  }

  const rows: HubspotSalesData['rows'] = deals
    .filter((d) => (d.properties?.hs_is_closed ?? '').toString() !== 'true')
    .slice()
    .sort(
      (a, b) =>
        (Number(b.properties?.amount ?? 0) || 0) - (Number(a.properties?.amount ?? 0) || 0),
    )
    .slice(0, 5)
    .map((d) => ({
      id: d.id,
      name: d.properties?.dealname ?? 'Untitled deal',
      amount: Number(d.properties?.amount ?? 0) || 0,
      stage: d.properties?.dealstage ?? 'unknown',
      close_date: d.properties?.closedate
        ? new Date(d.properties.closedate).toISOString().slice(0, 10)
        : null,
    }));

  let newLeads = 0;
  const contacts = contactsResp?.results ?? [];
  for (const contact of contacts) {
    const createIso = contact.properties?.createdate;
    if (createIso && new Date(createIso) >= thirtyAgo) newLeads += 1;
  }

  const sparkline = Object.entries(sparkBuckets)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, deals_created]) => ({ date, deals_created }));

  const dealsHasNext =
    typeof dealsResp?.paging?.next?.after === 'string' && dealsResp.paging.next.after.length > 0;
  const contactsHasNext =
    typeof contactsResp?.paging?.next?.after === 'string' &&
    contactsResp.paging.next.after.length > 0;
  const truncated = dealsHasNext || contactsHasNext;

  recentWon.sort((a, b) => new Date(b.closed_at).getTime() - new Date(a.closed_at).getTime());

  return {
    pipeline_value: pipelineValue,
    open_deals_count: openDealsCount,
    new_leads: newLeads,
    deals_won_this_month: dealsWonThisMonth,
    sparkline,
    currency: 'USD',
    truncated,
    rows,
    recent_deals_won: recentWon.slice(0, 5),
  };
}

export async function GET(_req: NextRequest): Promise<NextResponse<SalesLiveResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (redis) {
    const cached = await redis.get<SalesLiveResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  let dealsResp: HubspotDealsResponse | null;
  let contactsResp: HubspotContactsResponse | null;
  try {
    [dealsResp, contactsResp] = await Promise.all([
      // TODO(composio-slug): verify HUBSPOT_LIST_DEALS action + arg names
      safeExecuteComposioAction<HubspotDealsResponse>(
        userId,
        'hubspot',
        'HUBSPOT_LIST_DEALS',
        {
          limit: 100,
          properties: [
            'amount',
            'dealstage',
            'dealname',
            'createdate',
            'closedate',
            'hs_is_closed',
            'hs_is_closed_won',
          ],
        },
      ),
      // TODO(composio-slug): verify HUBSPOT_LIST_CONTACTS action + arg names
      safeExecuteComposioAction<HubspotContactsResponse>(
        userId,
        'hubspot',
        'HUBSPOT_LIST_CONTACTS',
        {
          limit: 100,
          properties: ['createdate', 'email'],
        },
      ),
    ]);
  } catch (err) {
    if (err instanceof ComposioExecuteError) {
      console.error('[sales-live] composio fetch failed:', err);
      // HubSpot auth failures bubble through Composio with the upstream 401 in
      // the message — surface as requires_reconnect so the UI prompts the user.
      if (/\b401\b|unauthor/i.test(err.message)) {
        return NextResponse.json({ status: 'requires_reconnect' });
      }
      return NextResponse.json({ status: 'unavailable', message: err.message });
    }
    console.error('[sales-live] unexpected error:', err);
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    });
  }

  // If the user has no Composio connection for HubSpot, both calls returned null.
  if (dealsResp === null && contactsResp === null) {
    return NextResponse.json({ status: 'not_connected' });
  }

  const data = shapeHubspotSalesData(dealsResp, contactsResp);
  const lastSyncedAt = new Date().toISOString();

  const payload: SalesLiveResponse = {
    status: 'ok',
    data,
    last_synced_at: lastSyncedAt,
    from_cache: false,
  };
  if (redis) {
    await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  }
  return NextResponse.json(payload);
}
