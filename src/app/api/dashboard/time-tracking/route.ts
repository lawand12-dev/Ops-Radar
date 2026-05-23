import { NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import {
  safeExecuteComposioAction,
  ComposioExecuteError,
} from '<npm>/lib/composio-fetch';
import type { TogglTimeData } from '<npm>/lib/integration-types';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:time:${userId}`;

type TimeResponse =
  | { status: 'ok'; data: TogglTimeData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'requires_reconnect' }
  | { status: 'unavailable'; message: string };

// --- Toggl payload shapes (only fields we read) ---
type TogglTimeEntry = {
  workspace_id?: number;
  project_id?: number | null;
  duration?: number;
};

type TogglProject = {
  id?: number;
  name?: string;
  color?: string;
};

type TogglWorkspace = {
  id?: number;
};

function unwrapList<T>(payload: unknown): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  const obj = payload as { data?: unknown };
  if (Array.isArray(obj?.data)) return obj.data as T[];
  const nested = (obj?.data as { data?: unknown } | undefined)?.data;
  if (Array.isArray(nested)) return nested as T[];
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

function shapeTogglData(
  entries: TogglTimeEntry[],
  projects: TogglProject[],
): TogglTimeData {
  const completed = entries.filter((e) => (e.duration ?? 0) > 0);
  const totalSeconds = completed.reduce((s, e) => s + (e.duration ?? 0), 0);
  const hours_tracked = Math.round((totalSeconds / 3600) * 10) / 10;
  const utilization_pct =
    hours_tracked > 0 ? Math.round((hours_tracked / 40) * 1000) / 10 : null;

  const byProjectId: Record<string, number> = {};
  for (const e of completed) {
    const key = e.project_id != null ? String(e.project_id) : '__none__';
    byProjectId[key] = (byProjectId[key] ?? 0) + (e.duration ?? 0);
  }

  const projectById = new Map(
    projects
      .filter((p) => typeof p.id === 'number')
      .map((p) => [String(p.id), p]),
  );

  const by_project = Object.entries(byProjectId)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([pid, secs]) => {
      const proj = projectById.get(pid);
      return {
        project_name:
          proj?.name ?? (pid === '__none__' ? 'No project' : `Project ${pid}`),
        hours: Math.round((secs / 3600) * 10) / 10,
        color: proj?.color ?? '#6b7280',
      };
    });

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
    const cached = await redis.get<TimeResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  const now = new Date();
  const weekStart = startOfWeekUtc(now);
  const startDate = weekStart.toISOString().slice(0, 10);
  const endDate = now.toISOString().slice(0, 10);

  let data: TogglTimeData;
  try {
    // TODO(composio-slug): verify TOGGL_LIST_TIME_ENTRIES action slug.
    const entriesPayload = await safeExecuteComposioAction<unknown>(
      userId,
      'toggl',
      'TOGGL_LIST_TIME_ENTRIES',
      { start_date: startDate, end_date: endDate },
    );

    if (entriesPayload === null) {
      return NextResponse.json({ status: 'not_connected' });
    }

    const entries = unwrapList<TogglTimeEntry>(entriesPayload);

    // Resolve project names via TOGGL_LIST_PROJECTS scoped to the user's
    // workspace. Toggl projects are workspace-scoped so we need the workspace
    // id from TOGGL_LIST_WORKSPACES (or infer from the entries).
    // TODO(composio-slug): verify TOGGL_LIST_WORKSPACES / TOGGL_LIST_PROJECTS slugs.
    let workspaceId: number | undefined =
      entries.find((e) => typeof e.workspace_id === 'number')?.workspace_id ??
      undefined;

    if (workspaceId === undefined) {
      const workspacesPayload = await safeExecuteComposioAction<unknown>(
        userId,
        'toggl',
        'TOGGL_LIST_WORKSPACES',
      );
      const workspaces = unwrapList<TogglWorkspace>(workspacesPayload);
      workspaceId = workspaces.find((w) => typeof w.id === 'number')?.id;
    }

    let projects: TogglProject[] = [];
    if (workspaceId !== undefined) {
      const projectsPayload = await safeExecuteComposioAction<unknown>(
        userId,
        'toggl',
        'TOGGL_LIST_PROJECTS',
        { workspace_id: workspaceId, active: true },
      );
      projects = unwrapList<TogglProject>(projectsPayload);
    }

    data = shapeTogglData(entries, projects);
  } catch (err) {
    console.error('[time-tracking] composio fetch failed:', err);
    if (err instanceof ComposioExecuteError) {
      return NextResponse.json({ status: 'requires_reconnect' });
    }
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    });
  }

  const lastSyncedAt = new Date().toISOString();
  const payload: TimeResponse = {
    status: 'ok',
    data,
    last_synced_at: lastSyncedAt,
    from_cache: false,
  };
  if (redis) await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(payload);
}
