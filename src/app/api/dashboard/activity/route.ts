import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { Redis } from '@upstash/redis';

const CACHE_TTL_SECONDS = 60;
const MAX_EVENTS = 10;

type ActivityEventType =
  | 'stripe_charge'
  | 'hubspot_deal'
  | 'workflow_run'
  | 'calendly_booking'
  | 'integration_incident';

type ActivityEvent = {
  type: ActivityEventType;
  icon: string;          // single-char hint for the UI
  entity_label: string;  // bold-able real name
  message: string;       // single sentence
  source: 'stripe' | 'hubspot' | 'n8n' | 'calendly' | 'opsradar';
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
// Stripe finance response: { status, data: { invoiced, paid, overdue, sparkline, currency } }
// No recent_charges field — sparkline has daily totals but no per-charge events.
// Returns empty array until a future version of the finance endpoint exposes a charges list.
function adaptStripe(_data: unknown): ActivityEvent[] {
  return [];
}

// HubSpot sales-live response: { status, data: { pipeline_value, open_deals_count,
//   new_leads, deals_won_this_month, sparkline, currency, truncated } }
// No recent_transitions field — aggregate counts only, no per-event list.
// Returns empty array until a future version exposes deal-transition events.
function adaptHubspot(_data: unknown): ActivityEvent[] {
  return [];
}

// Workflow-health response: { status, workflows: Array<{ name, last_run_at, status, ... }> }
// Field names match the plan assumptions. Works correctly.
function adaptWorkflows(data: unknown): ActivityEvent[] {
  const workflows = (data as { workflows?: Array<{ name?: string; last_run_at?: string | null; status?: string }> })
    ?.workflows ?? [];
  return workflows.slice(0, 5).flatMap((w) => {
    if (!w.name || !w.last_run_at) return [];
    return [{
      type: 'workflow_run' as const,
      icon: '▶',
      entity_label: w.name,
      message: `Workflow ran · ${w.status ?? 'ok'}`,
      source: 'n8n' as const,
      timestamp: w.last_run_at,
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

  const redis = Redis.fromEnv();
  const cacheKey = `dashboard:activity:${userId}`;
  const cached = await redis.get<ActivityResponse>(cacheKey);
  if (cached?.status === 'ok') return NextResponse.json(cached);

  const settled = await Promise.allSettled([
    fetchUpstream(request, 'finance').then(adaptStripe),
    fetchUpstream(request, 'sales-live').then(adaptHubspot),
    fetchUpstream(request, 'workflow-health').then(adaptWorkflows),
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

  await redis.set(cacheKey, body, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(body);
}
