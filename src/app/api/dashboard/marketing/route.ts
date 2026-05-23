import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import {
  safeExecuteComposioAction,
  ComposioExecuteError,
} from '<npm>/lib/composio-fetch';
import type { ApolloMarketingData } from '<npm>/lib/integrations/apollo/adapter';
import type { CalendlyBookingsData } from '<npm>/lib/integrations/calendly/adapter';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:marketing:${userId}`;

type MarketingData = {
  emails_sent: number | null;
  open_rate_pct: number | null;
  reply_rate_pct: number | null;
  reply_sparkline: number[] | null;
  meetings_booked: number | null;
  meeting_conversion_pct: number | null;
  apollo_connected: boolean;
  calendly_connected: boolean;
  period_label: string;
  sequences: ApolloMarketingData['sequences'];
  upcoming: CalendlyBookingsData['upcoming'];
};

type MarketingResponse =
  | { status: 'ok'; data: MarketingData }
  | { status: 'error'; message: string };

// --- Apollo --------------------------------------------------------------

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
  emailer_campaigns?: ApolloCampaign[];
  pagination?: { total_entries?: number };
};

function shapeApollo(resp: ApolloCampaignsResponse | null): ApolloMarketingData | null {
  if (!resp) return null;
  const campaigns = resp.emailer_campaigns ?? [];

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

// --- Calendly ------------------------------------------------------------

type CalendlyEvent = {
  uri: string;
  name: string;
  start_time: string;
  status: string;
};

type CalendlyEventsResponse = {
  collection?: CalendlyEvent[];
};

type CalendlyInvitee = { name?: string; email?: string };
type CalendlyInviteesResponse = { collection?: CalendlyInvitee[] };

async function loadCalendlyInvitee(
  userId: string,
  eventUri: string,
): Promise<CalendlyInvitee | null> {
  const eventUuid = eventUri.split('/').pop();
  if (!eventUuid) return null;
  try {
    // TODO(composio-slug): verify CALENDLY_LIST_INVITEES action + arg names
    const r = await safeExecuteComposioAction<CalendlyInviteesResponse>(
      userId,
      'calendly',
      'CALENDLY_LIST_INVITEES',
      { event_uuid: eventUuid, count: 1 },
    );
    return r?.collection?.[0] ?? null;
  } catch {
    return null;
  }
}

async function shapeCalendly(
  userId: string,
  eventsResp: CalendlyEventsResponse | null,
): Promise<CalendlyBookingsData | null> {
  if (!eventsResp) return null;
  const now = new Date();
  const events = eventsResp.collection ?? [];

  const past = events.filter((e) => new Date(e.start_time) < now);
  const upcomingEvents = events.filter((e) => new Date(e.start_time) >= now).slice(0, 10);

  const upcoming = await Promise.all(
    upcomingEvents.map(async (e) => {
      const invitee = await loadCalendlyInvitee(userId, e.uri);
      return {
        name: e.name,
        invitee_name: invitee?.name ?? 'Unknown',
        invitee_email: invitee?.email ?? '',
        start_time: e.start_time,
      };
    }),
  );

  return {
    meetings_booked: past.length,
    meeting_conversion_pct: null,
    period_label: 'Last 7 days',
    upcoming,
  };
}

// --- Route ---------------------------------------------------------------

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'error', message: 'unauthorized' }, { status: 401 });
  }

  const fresh = req.nextUrl.searchParams.get('fresh') === '1';
  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (!fresh && redis) {
    const cached = await redis.get<MarketingResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') return NextResponse.json(cached);
  }

  // Apollo
  let apolloRaw: ApolloCampaignsResponse | null = null;
  let apolloConnected = false;
  try {
    // TODO(composio-slug): verify APOLLO_SEARCH_EMAILER_CAMPAIGNS action + arg names
    apolloRaw = await safeExecuteComposioAction<ApolloCampaignsResponse>(
      userId,
      'apollo',
      'APOLLO_SEARCH_EMAILER_CAMPAIGNS',
      { per_page: 25, status: 'active' },
    );
    apolloConnected = apolloRaw !== null;
  } catch (err) {
    // Treat any execute failure as "connected but degraded" — we keep the
    // widget renderable and surface zeros rather than tearing down the whole
    // marketing card. The error is logged for ops visibility.
    console.error('[marketing] apollo composio fetch failed:', err);
    if (err instanceof ComposioExecuteError) {
      apolloConnected = true; // connection exists, just call failed
    }
  }
  const apolloData = shapeApollo(apolloRaw);

  // Calendly
  let calendlyRaw: CalendlyEventsResponse | null = null;
  let calendlyConnected = false;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  try {
    // TODO(composio-slug): verify CALENDLY_LIST_EVENTS action + arg names
    calendlyRaw = await safeExecuteComposioAction<CalendlyEventsResponse>(
      userId,
      'calendly',
      'CALENDLY_LIST_EVENTS',
      {
        min_start_time: sevenDaysAgo.toISOString(),
        max_start_time: sevenDaysFromNow.toISOString(),
        status: 'active',
        count: 25,
      },
    );
    calendlyConnected = calendlyRaw !== null;
  } catch (err) {
    console.error('[marketing] calendly composio fetch failed:', err);
    if (err instanceof ComposioExecuteError) {
      calendlyConnected = true;
    }
  }
  const calendlyData = await shapeCalendly(userId, calendlyRaw);

  const payload: MarketingResponse = {
    status: 'ok',
    data: {
      emails_sent: apolloData?.emails_sent ?? null,
      open_rate_pct: apolloData?.open_rate_pct ?? null,
      reply_rate_pct: apolloData?.reply_rate_pct ?? null,
      reply_sparkline: apolloData?.reply_sparkline ?? null,
      meetings_booked: calendlyData?.meetings_booked ?? null,
      meeting_conversion_pct: calendlyData?.meeting_conversion_pct ?? null,
      apollo_connected: apolloConnected,
      calendly_connected: calendlyConnected,
      period_label:
        apolloData?.period_label ?? calendlyData?.period_label ?? 'Last 30 days',
      sequences: apolloData?.sequences ?? [],
      upcoming: calendlyData?.upcoming ?? [],
    },
  };

  if (redis) await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(payload);
}
