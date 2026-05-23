import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import {
  safeExecuteComposioAction,
  ComposioExecuteError,
} from '<npm>/lib/composio-fetch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * /api/dashboard/sales — high-level HubSpot summary card on the dashboard.
 *
 * Migrated 2026-05-23: was an n8n webhook proxy through fetchDashboardWidget.
 * Now fetches HubSpot via Composio OAuth, then projects the data into the
 * SalesWidgetData shape the SalesCard component expects.
 *
 * Response envelope intentionally matches `WidgetFetchResult<SalesWidgetData>`
 * from `dashboard-fetch.ts` so the client component does not change:
 *   - { status: 'ok', data, fromCache: false }
 *   - { status: 'error', message }
 *
 * `hubspot_connected=false` is returned as an `ok` payload (per the original
 * n8n response contract) so the card can render the "connect" CTA without
 * treating it as a fetch error.
 */
type SalesWidgetData = {
  hubspot_connected: boolean;
  pipeline_value: number | null;
  new_leads: number | null;
  auto_leads: number | null;
  sparkline: number[] | null;
  period_label: string;
};

type WidgetEnvelope<T> =
  | { status: 'ok'; data: T; fromCache: boolean }
  | { status: 'error'; message: string };

type HubspotDealsResponse = {
  results?: Array<{
    id: string;
    properties?: {
      amount?: string | null;
      createdate?: string | null;
      closedate?: string | null;
      hs_is_closed?: string | null;
    };
  }>;
};

type HubspotContactsResponse = {
  results?: Array<{
    id: string;
    properties?: {
      createdate?: string | null;
      hs_object_source_label?: string | null;
    };
  }>;
};

function daysAgo(now: Date, n: number): Date {
  const d = new Date(now); d.setUTCDate(d.getUTCDate() - n); return d;
}

function shape(
  deals: HubspotDealsResponse | null,
  contacts: HubspotContactsResponse | null,
): SalesWidgetData {
  const now = new Date();
  const fourteenAgo = daysAgo(now, 14);

  let pipelineValue = 0;
  const buckets: number[] = Array(14).fill(0);
  for (const d of deals?.results ?? []) {
    const isClosed = (d.properties?.hs_is_closed ?? '').toString() === 'true';
    if (!isClosed) {
      pipelineValue += Number(d.properties?.amount ?? 0) || 0;
    }
    const createIso = d.properties?.createdate;
    if (createIso) {
      const created = new Date(createIso);
      if (created >= fourteenAgo) {
        const dayIndex = 13 - Math.floor((now.getTime() - created.getTime()) / 86_400_000);
        if (dayIndex >= 0 && dayIndex < 14) buckets[dayIndex] += 1;
      }
    }
  }

  let newLeads = 0;
  let autoLeads = 0;
  for (const c of contacts?.results ?? []) {
    const createIso = c.properties?.createdate;
    if (!createIso) continue;
    if (new Date(createIso) >= fourteenAgo) {
      newLeads += 1;
      // HubSpot's hs_object_source_label is the canonical "where did this
      // contact come from" field; INTEGRATION / API are the auto-created ones.
      const src = (c.properties?.hs_object_source_label ?? '').toString().toUpperCase();
      if (src.includes('INTEGRATION') || src.includes('API') || src.includes('WORKFLOW')) {
        autoLeads += 1;
      }
    }
  }

  return {
    hubspot_connected: true,
    pipeline_value: pipelineValue,
    new_leads: newLeads,
    auto_leads: autoLeads,
    sparkline: buckets,
    period_label: 'Last 14 days',
  };
}

const NOT_CONNECTED: SalesWidgetData = {
  hubspot_connected: false,
  pipeline_value: null,
  new_leads: null,
  auto_leads: null,
  sparkline: null,
  period_label: 'Last 14 days',
};

export async function GET(_req: NextRequest) {
  const clientId = await getCurrentUserId();
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let dealsResp: HubspotDealsResponse | null;
  let contactsResp: HubspotContactsResponse | null;
  try {
    [dealsResp, contactsResp] = await Promise.all([
      // TODO(composio-slug): verify HUBSPOT_LIST_DEALS action + arg names
      safeExecuteComposioAction<HubspotDealsResponse>(
        clientId,
        'hubspot',
        'HUBSPOT_LIST_DEALS',
        {
          limit: 100,
          properties: ['amount', 'createdate', 'closedate', 'hs_is_closed'],
        },
      ),
      // TODO(composio-slug): verify HUBSPOT_LIST_CONTACTS action + arg names
      safeExecuteComposioAction<HubspotContactsResponse>(
        clientId,
        'hubspot',
        'HUBSPOT_LIST_CONTACTS',
        {
          limit: 100,
          properties: ['createdate', 'hs_object_source_label'],
        },
      ),
    ]);
  } catch (err) {
    const message =
      err instanceof ComposioExecuteError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'hubspot_fetch_failed';
    console.error('[sales] composio fetch failed:', err);
    const envelope: WidgetEnvelope<SalesWidgetData> = { status: 'error', message };
    return NextResponse.json(envelope);
  }

  // Both null = no Composio connection for HubSpot. Surface as a successful
  // `ok` envelope with `hubspot_connected: false` so the card renders its
  // not-connected CTA (matches the legacy n8n contract).
  if (dealsResp === null && contactsResp === null) {
    const envelope: WidgetEnvelope<SalesWidgetData> = {
      status: 'ok',
      data: NOT_CONNECTED,
      fromCache: false,
    };
    return NextResponse.json(envelope);
  }

  const data = shape(dealsResp, contactsResp);
  const envelope: WidgetEnvelope<SalesWidgetData> = {
    status: 'ok',
    data,
    fromCache: false,
  };
  return NextResponse.json(envelope);
}
