import { NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import {
  safeExecuteComposioAction,
  ComposioExecuteError,
} from '<npm>/lib/composio-fetch';
import type {
  HarvestTimeData,
  HarvestProjectRow,
} from '<npm>/lib/integration-types';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:time-harvest:${userId}`;

type Resp =
  | { status: 'ok'; data: HarvestTimeData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'requires_reconnect' }
  | { status: 'unavailable'; message: string };

// --- Harvest payload shapes (only fields we read) ---
type HarvestEntry = {
  hours?: number;
  project?: { name?: string } | null;
  client?: { name?: string } | null;
};

function unwrapList<T>(payload: unknown, key?: string): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  const obj = payload as Record<string, unknown>;
  // Harvest API returns { time_entries: [...] }; Composio may pass that through.
  if (key && Array.isArray(obj[key])) return obj[key] as T[];
  if (Array.isArray(obj.data)) return obj.data as T[];
  const nested = obj.data as Record<string, unknown> | undefined;
  if (nested) {
    if (key && Array.isArray(nested[key])) return nested[key] as T[];
    if (Array.isArray(nested.data)) return nested.data as T[];
  }
  return [];
}

function startOfWeekUtc(now: Date): Date {
  const dayOfWeek = now.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const out = new Date(now);
  out.setUTCDate(now.getUTCDate() - daysFromMonday);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function shapeHarvestTime(entries: HarvestEntry[]): HarvestTimeData {
  const totalHours = entries.reduce((s, e) => s + (Number(e.hours) || 0), 0);
  const hours_tracked = Math.round(totalHours * 10) / 10;
  const utilization_pct =
    hours_tracked > 0 ? Math.round((hours_tracked / 40) * 1000) / 10 : null;

  const byProject = new Map<string, { hours: number; client: string | null }>();
  for (const e of entries) {
    const name = e.project?.name ?? 'No project';
    const cur = byProject.get(name) ?? { hours: 0, client: e.client?.name ?? null };
    cur.hours += Number(e.hours) || 0;
    if (!cur.client && e.client?.name) cur.client = e.client.name;
    byProject.set(name, cur);
  }

  const by_project: HarvestProjectRow[] = [...byProject.entries()]
    .map(([project_name, v]) => ({
      project_name,
      hours: Math.round(v.hours * 10) / 10,
      client_name: v.client,
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  return { hours_tracked, utilization_pct, by_project, period_label: 'This week' };
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { status: 'unavailable', message: 'unauthorized' },
      { status: 401 },
    );
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (redis) {
    const cached = await redis.get<Resp>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  const now = new Date();
  const weekStart = startOfWeekUtc(now);
  const from = weekStart.toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);

  let data: HarvestTimeData;
  try {
    // TODO(composio-slug): verify HARVEST_LIST_TIME_ENTRIES action slug.
    const entriesPayload = await safeExecuteComposioAction<unknown>(
      userId,
      'harvest',
      'HARVEST_LIST_TIME_ENTRIES',
      { from, to, user_id: 'me', per_page: 100 },
    );

    if (entriesPayload === null) {
      return NextResponse.json({ status: 'not_connected' });
    }

    const entries = unwrapList<HarvestEntry>(entriesPayload, 'time_entries');
    data = shapeHarvestTime(entries);
  } catch (err) {
    console.error('[time-harvest] composio fetch failed:', err);
    if (err instanceof ComposioExecuteError) {
      return NextResponse.json({ status: 'requires_reconnect' });
    }
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    });
  }

  const lastSyncedAt = new Date().toISOString();
  const payload: Resp = {
    status: 'ok',
    data,
    last_synced_at: lastSyncedAt,
    from_cache: false,
  };
  if (redis) await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(payload);
}
