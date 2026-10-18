import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { Redis } from '@upstash/redis';

const CACHE_TTL_SECONDS = 60;
const MAX_EVENTS = 10;

type ActivityEventType =
  | 'hubspot_deal'
  | 'calendly_booking'
  | 'integration_incident';

type ActivityEvent = {
  type: ActivityEventType;
  icon: string;          // single-char hint for the UI
  entity_label: string;  // bold-able real name
  message: string;       // single sentence
  source: 'hubspot' | 'calendly' | 'opsradar';
  timestamp: string;     // ISO8601
};

type ActivityResponse = {
  status: 'ok' | 'unavailable';
  events?: ActivityEvent[];
  generated_at?: string;
  message?: string;
};

async function fetchUpstream(
  request: NextRequest,
  endpoint: string,
): Promise<unknown> {
  const origin = new URL(request.url).origin;
  const cookie = request.headers.get('cookie') ?? '';
  const res = await fetch(`${origin}/api/dashboard/${endpoint}`, {
    headers: { cookie },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${endpoint} ${res.status}`);
  return res.json();
}

// Each adapter reads upstream shape and emits 0–5 events.
// Adapters MUST be defensive — any missing field is silently skipped.
//
// HubSpot sales-live response: { status, data: { ..., recent_deals_won: [{ id, name, amount, closed_at }] } }
function adaptHubspot(data: unknown): ActivityEvent[] {
  const deals = (data as { data?: { recent_deals_won?: Array<{ id?: string; name?: string; amount?: number; closed_at?: string }> } } | null)
    ?.data?.recent_deals_won ?? [];
  return deals.flatMap((d) => {
    if (!d.closed_at) return [];
    const amount = d.amount != null ? ` · $${d.amount.toFixed(2)}` : '';
    return [{
      type: 'hubspot_deal' as const,
      icon: '🤝',
      entity_label: d.name ?? 'Deal',
      message: `Deal closed-won${amount}`,
      source: 'hubspot' as const,
      timestamp: d.closed_at,
    }];
  });
}

// Marketing response: { emails_sent, open_rate_pct, meetings_booked,
//   apollo_connected, calendly_connected, period_label, ... }
// No recent_bookings field — aggregate counts only, no per-booking events.
// Returns empty array until a future version exposes booking-level events.
function adaptMarketing(_data: unknown): ActivityEvent[] {
  return [];
}

export async function GET(request: NextRequest): Promise<NextResponse<ActivityResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const redis = (() => { try { return Redis.fromEnv(); } catch { return null; } })();
  const cacheKey = `dashboard:activity:${userId}`;
  if (redis) {
    const cached = await redis.get<ActivityResponse>(cacheKey);
    if (cached?.status === 'ok') return NextResponse.json(cached);
  }

  const settled = await Promise.allSettled([
    fetchUpstream(request, 'sales-live').then(adaptHubspot),
    fetchUpstream(request, 'marketing').then(adaptMarketing),
  ]);

  const events: ActivityEvent[] = [];
  for (const s of settled) {
    if (s.status === 'fulfilled') events.push(...s.value);
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const top = events.slice(0, MAX_EVENTS);

  const body: ActivityResponse = {
    status: 'ok',
    events: top,
    generated_at: new Date().toISOString(),
  };

  if (redis) await redis.set(cacheKey, body, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(body);
}
