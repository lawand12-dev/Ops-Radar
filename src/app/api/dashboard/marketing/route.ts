import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import {
  fetchApolloMarketingData,
  type ApolloMarketingData,
} from '<npm>/lib/integrations/apollo/adapter';
import {
  fetchCalendlyBookingsData,
  type CalendlyBookingsData,
} from '<npm>/lib/integrations/calendly/adapter';
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

type IntegrationRow = {
  tool: string;
  encrypted_token: string;
  iv: string;
  auth_tag: string;
  status: string;
};

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

  const supabase = getServerSupabaseClient();
  const { data: rows } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .in('tool', ['apollo', 'calendly']);

  const apolloRow = (rows ?? []).find(
    (r): r is IntegrationRow => r.tool === 'apollo' && r.status === 'connected',
  );
  const calendlyRow = (rows ?? []).find(
    (r): r is IntegrationRow => r.tool === 'calendly' && r.status === 'connected',
  );

  let apolloData: ApolloMarketingData | null = null;
  let apolloConnected = false;
  if (apolloRow?.encrypted_token) {
    try {
      const key = decryptApiKey({
        encrypted_token: apolloRow.encrypted_token,
        iv: apolloRow.iv,
        auth_tag: apolloRow.auth_tag,
      });
      apolloData = await fetchApolloMarketingData(key);
      apolloConnected = true;
    } catch (err) {
      console.error('[marketing] apollo fetch failed:', err);
    }
  }

  let calendlyData: CalendlyBookingsData | null = null;
  let calendlyConnected = false;
  if (calendlyRow?.encrypted_token) {
    try {
      const key = decryptApiKey({
        encrypted_token: calendlyRow.encrypted_token,
        iv: calendlyRow.iv,
        auth_tag: calendlyRow.auth_tag,
      });
      calendlyData = await fetchCalendlyBookingsData(key);
      calendlyConnected = true;
    } catch (err) {
      console.error('[marketing] calendly fetch failed:', err);
    }
  }

  const synced = [
    ...(apolloConnected ? ['apollo'] : []),
    ...(calendlyConnected ? ['calendly'] : []),
  ];
  if (synced.length > 0) {
    await supabase
      .from('integrations')
      .update({ last_synced_at: new Date().toISOString(), last_error: null })
      .eq('client_id', userId)
      .in('tool', synced);
  }

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
