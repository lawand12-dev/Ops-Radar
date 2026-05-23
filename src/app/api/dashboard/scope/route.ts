// src/app/api/dashboard/scope/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import {
  isComposioConnected,
  safeExecuteComposioAction,
} from '<npm>/lib/composio-fetch';
import type { ClickupScopeData } from '<npm>/lib/integrations/clickup/scope-adapter';
import type { HarvestMonthlyProjectData } from '<npm>/lib/integrations/harvest/adapter';
import { computeScopeCreep, type ScopeCreepResult } from '<npm>/lib/scope-creep';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:scope:${userId}`;

type ScopeResponse =
  | { status: 'ok'; data: ScopeCreepResult; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected'; missing: ('clickup' | 'harvest')[] }
  | { status: 'upgrade_required'; required_plan: string; required_plan_label: string; required_plan_price: string }
  | { status: 'unavailable'; message: string };

// --- Raw payload shapes (only fields we read) ---
type ClickupTeam = { id: string };
type ClickupScopeTask = {
  time_estimate?: number | null;
  list?: { name?: string } | null;
};

type HarvestEntry = {
  hours?: number;
  project?: { name?: string } | null;
};

function unwrapList<T>(payload: unknown, key?: string): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  const obj = payload as Record<string, unknown>;
  if (key && Array.isArray(obj[key])) return obj[key] as T[];
  if (Array.isArray(obj.data)) return obj.data as T[];
  const nested = obj.data as Record<string, unknown> | undefined;
  if (nested) {
    if (key && Array.isArray(nested[key])) return nested[key] as T[];
    if (Array.isArray(nested.data)) return nested.data as T[];
  }
  return [];
}

function shapeClickupScope(tasks: ClickupScopeTask[]): ClickupScopeData {
  const budgetMap = new Map<string, number>();
  for (const task of tasks) {
    const name = task.list?.name ?? 'No project';
    const estimateMs = typeof task.time_estimate === 'number' ? task.time_estimate : 0;
    budgetMap.set(name, (budgetMap.get(name) ?? 0) + estimateMs / 3_600_000);
  }
  const projects = [...budgetMap.entries()]
    .filter(([, hours]) => hours > 0)
    .map(([project_name, hours]) => ({
      project_name,
      estimated_hours: Math.round(hours * 10) / 10,
    }))
    .sort((a, b) => b.estimated_hours - a.estimated_hours);
  return { projects };
}

function shapeHarvestMonthly(entries: HarvestEntry[]): HarvestMonthlyProjectData {
  const projectMap = new Map<string, number>();
  for (const e of entries) {
    const name = e.project?.name ?? 'No project';
    projectMap.set(name, (projectMap.get(name) ?? 0) + (Number(e.hours) || 0));
  }
  const projects = [...projectMap.entries()]
    .map(([project_name, hours]) => ({
      project_name,
      hours: Math.round(hours * 10) / 10,
    }))
    .sort((a, b) => b.hours - a.hours);
  return { projects };
}

async function fetchClickupScope(userId: string): Promise<ClickupScopeData> {
  // TODO(composio-slug): verify CLICKUP_LIST_SPACES / CLICKUP_LIST_TASKS slugs.
  // ClickUp's team-level task endpoint requires a team_id; resolve via spaces (each space is under a team).
  // We fall back gracefully if any call returns nothing.
  const spacesPayload = await safeExecuteComposioAction<unknown>(
    userId,
    'clickup',
    'CLICKUP_LIST_SPACES',
  );
  const spaces = unwrapList<{ team_id?: string; id?: string }>(spacesPayload, 'spaces');
  const teamId = spaces.find((s) => typeof s.team_id === 'string')?.team_id;

  // Composio may also expose a teams-list action. Without the teamId we still try the tasks action
  // (some Composio implementations resolve team automatically from the connection).
  const tasksPayload = await safeExecuteComposioAction<unknown>(
    userId,
    'clickup',
    'CLICKUP_LIST_TASKS',
    {
      team_id: teamId,
      include_closed: true,
      subtasks: true,
      archived: false,
      per_page: 100,
    },
  );
  const tasks = unwrapList<ClickupScopeTask>(tasksPayload, 'tasks');
  return shapeClickupScope(tasks);
}

async function fetchHarvestMonthly(userId: string): Promise<HarvestMonthlyProjectData> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  // TODO(composio-slug): verify HARVEST_LIST_TIME_ENTRIES action slug.
  const entriesPayload = await safeExecuteComposioAction<unknown>(
    userId,
    'harvest',
    'HARVEST_LIST_TIME_ENTRIES',
    {
      from: monthStart.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
      per_page: 100,
    },
  );
  const entries = unwrapList<HarvestEntry>(entriesPayload, 'time_entries');
  return shapeHarvestMonthly(entries);
}

export async function GET(): Promise<NextResponse<ScopeResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const sessionSupabase = await getSessionSupabaseClient();
  const { data: userData } = await sessionSupabase.auth.getUser();
  const plan = getUserPlan(userData?.user?.user_metadata ?? null);
  if (!canAccess(plan, 'scope')) {
    return NextResponse.json(upgradeRequiredBody('growth'), { status: 402 });
  }

  // Determine which tools the user has connected so we can decide between
  // "not_connected" (neither tool) and a partial render.
  const [clickupConnected, harvestConnected] = await Promise.all([
    isComposioConnected(userId, 'clickup'),
    isComposioConnected(userId, 'harvest'),
  ]);

  const missing: ('clickup' | 'harvest')[] = [];
  if (!clickupConnected) missing.push('clickup');
  if (!harvestConnected) missing.push('harvest');

  if (missing.length === 2) {
    return NextResponse.json({ status: 'not_connected', missing });
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (redis && missing.length === 0) {
    const cached = await redis.get<ScopeResponse>(CACHE_KEY(userId));
    if (cached?.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  try {
    const [clickupData, harvestData] = await Promise.all([
      clickupConnected
        ? fetchClickupScope(userId)
        : Promise.resolve<ClickupScopeData>({ projects: [] }),
      harvestConnected
        ? fetchHarvestMonthly(userId)
        : Promise.resolve<HarvestMonthlyProjectData>({ projects: [] }),
    ]);

    const data = computeScopeCreep(clickupData, harvestData);
    const last_synced_at = new Date().toISOString();
    const payload: ScopeResponse = { status: 'ok', data, last_synced_at, from_cache: false };

    if (redis && missing.length === 0) {
      await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[scope] composio fetch failed:', err);
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    });
  }
}
