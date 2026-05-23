import { NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import {
  isComposioConnected,
  safeExecuteComposioAction,
} from '<npm>/lib/composio-fetch';
import type {
  DeliveryData,
  DeliveryTask,
} from '<npm>/lib/integrations/delivery-types';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:delivery:${userId}`;

type DeliveryResponse =
  | { status: 'ok'; data: DeliveryData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'unavailable'; message: string };

// --- Raw payload shapes (only fields we read) ---
type ClickupTask = {
  id?: string;
  name?: string;
  status?: { status?: string } | string | null;
  due_date?: string | number | null;
  list?: { name?: string } | null;
};

type AsanaWorkspace = { gid?: string };
type AsanaTask = {
  gid?: string;
  name?: string;
  completed?: boolean;
  due_on?: string | null;
  memberships?: Array<{ project?: { name?: string } }>;
};

type MondayBoard = {
  id?: string;
  name?: string;
  items_page?: { items?: MondayItem[] };
  items?: MondayItem[];
};
type MondayItem = {
  id?: string;
  name?: string;
  state?: string;
  column_values?: Array<{
    id?: string;
    type?: string;
    text?: string | null;
    value?: string | null;
  }>;
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

function shapeClickupTasks(tasks: ClickupTask[]): DeliveryData {
  const now = Date.now();
  const out: DeliveryTask[] = tasks.slice(0, 50).map((t) => {
    const rawDue = t.due_date;
    const dueMs =
      typeof rawDue === 'number'
        ? rawDue
        : typeof rawDue === 'string' && rawDue !== ''
          ? Number(rawDue)
          : null;
    const overdue = dueMs !== null && !Number.isNaN(dueMs) && dueMs < now;
    const status =
      typeof t.status === 'string'
        ? t.status
        : (t.status?.status ?? 'open');
    return {
      id: String(t.id ?? ''),
      name: t.name ?? '',
      status,
      due_date:
        dueMs !== null && !Number.isNaN(dueMs)
          ? new Date(dueMs).toISOString().slice(0, 10)
          : null,
      overdue,
      project_name: t.list?.name ?? 'No list',
      source: 'clickup' as const,
    };
  });
  const overdue_tasks = out.filter((t) => t.overdue).length;
  const active_projects = new Set(out.map((t) => t.project_name)).size;
  return { active_projects, overdue_tasks, tasks: out };
}

function shapeAsanaTasks(tasks: AsanaTask[]): DeliveryData {
  const today = new Date().toISOString().slice(0, 10);
  const out: DeliveryTask[] = tasks.map((t) => ({
    id: String(t.gid ?? ''),
    name: t.name ?? '',
    status: t.completed ? 'complete' : 'incomplete',
    due_date: t.due_on ?? null,
    overdue: t.due_on !== null && t.due_on !== undefined && t.due_on < today,
    project_name: t.memberships?.[0]?.project?.name ?? 'No project',
    source: 'asana' as const,
  }));
  const overdue_tasks = out.filter((t) => t.overdue).length;
  const active_projects = new Set(out.map((t) => t.project_name)).size;
  return { active_projects, overdue_tasks, tasks: out };
}

function shapeMondayBoards(boards: MondayBoard[]): DeliveryData {
  const today = new Date().toISOString().slice(0, 10);
  const tasks: DeliveryTask[] = [];
  for (const board of boards) {
    const items = board.items_page?.items ?? board.items ?? [];
    for (const item of items) {
      if (item.state && item.state !== 'active') continue;
      const dateCol = item.column_values?.find(
        (c) => c.type === 'date' || /due/i.test(c.id ?? ''),
      );
      const dueText = dateCol?.text?.trim() || null;
      const due =
        dueText && /^\d{4}-\d{2}-\d{2}/.test(dueText) ? dueText.slice(0, 10) : null;
      const overdue = due !== null && due < today;
      const statusCol = item.column_values?.find(
        (c) => c.type === 'status' || /status/i.test(c.id ?? ''),
      );
      tasks.push({
        id: String(item.id ?? ''),
        name: item.name ?? '',
        status: statusCol?.text || 'open',
        due_date: due,
        overdue,
        project_name: board.name ?? 'No board',
        source: 'monday' as const,
      });
    }
  }
  const slice = tasks.slice(0, 50);
  const overdue_tasks = slice.filter((t) => t.overdue).length;
  const active_projects = new Set(slice.map((t) => t.project_name)).size;
  return { active_projects, overdue_tasks, tasks: slice };
}

async function fetchClickupDelivery(userId: string): Promise<DeliveryData | null> {
  try {
    // TODO(composio-slug): verify CLICKUP_LIST_TASKS slug + arg shape.
    // Some Composio implementations resolve team_id from the connection;
    // pass through include_closed=false for active-only.
    const tasksPayload = await safeExecuteComposioAction<unknown>(
      userId,
      'clickup',
      'CLICKUP_LIST_TASKS',
      {
        include_closed: false,
        subtasks: false,
        archived: false,
        order_by: 'due_date',
        per_page: 100,
      },
    );
    if (tasksPayload === null) return null;
    const tasks = unwrapList<ClickupTask>(tasksPayload, 'tasks');
    return shapeClickupTasks(tasks);
  } catch (err) {
    console.error('[delivery] clickup fetch failed:', err);
    return { active_projects: 0, overdue_tasks: 0, tasks: [] };
  }
}

async function fetchAsanaDelivery(userId: string): Promise<DeliveryData | null> {
  try {
    // TODO(composio-slug): verify ASANA_LIST_WORKSPACES / ASANA_LIST_TASKS slugs.
    const workspacesPayload = await safeExecuteComposioAction<unknown>(
      userId,
      'asana',
      'ASANA_LIST_WORKSPACES',
    );
    if (workspacesPayload === null) return null;
    const workspaces = unwrapList<AsanaWorkspace>(workspacesPayload);
    const workspaceGid = workspaces.find((w) => typeof w.gid === 'string')?.gid;
    if (!workspaceGid) {
      return { active_projects: 0, overdue_tasks: 0, tasks: [] };
    }

    const tasksPayload = await safeExecuteComposioAction<unknown>(
      userId,
      'asana',
      'ASANA_LIST_TASKS',
      {
        workspace: workspaceGid,
        assignee: 'me',
        completed_since: 'now',
        opt_fields: 'name,completed,due_on,memberships.project.name',
        limit: 50,
      },
    );
    const tasks = unwrapList<AsanaTask>(tasksPayload);
    return shapeAsanaTasks(tasks);
  } catch (err) {
    console.error('[delivery] asana fetch failed:', err);
    return { active_projects: 0, overdue_tasks: 0, tasks: [] };
  }
}

async function fetchMondayDelivery(userId: string): Promise<DeliveryData | null> {
  try {
    // TODO(composio-slug): verify MONDAY_GET_BOARDS / MONDAY_LIST_ITEMS slugs.
    // Monday's API is GraphQL; Composio typically wraps a board-listing query
    // that returns boards with their items. If items aren't included we fall
    // back to a separate items call per board.
    const boardsPayload = await safeExecuteComposioAction<unknown>(
      userId,
      'monday',
      'MONDAY_GET_BOARDS',
      { limit: 10, state: 'active' },
    );
    if (boardsPayload === null) return null;
    let boards = unwrapList<MondayBoard>(boardsPayload, 'boards');

    // If boards came back without nested items, hydrate them.
    const needsItemHydration = boards.some(
      (b) => !b.items_page?.items?.length && !b.items?.length && b.id,
    );
    if (needsItemHydration) {
      const hydrated: MondayBoard[] = [];
      for (const board of boards) {
        if (
          (board.items_page?.items?.length ?? 0) === 0 &&
          (board.items?.length ?? 0) === 0 &&
          board.id
        ) {
          const itemsPayload = await safeExecuteComposioAction<unknown>(
            userId,
            'monday',
            'MONDAY_LIST_ITEMS',
            { board_id: board.id, limit: 50 },
          );
          const items = unwrapList<MondayItem>(itemsPayload, 'items');
          hydrated.push({ ...board, items });
        } else {
          hydrated.push(board);
        }
      }
      boards = hydrated;
    }

    return shapeMondayBoards(boards);
  } catch (err) {
    console.error('[delivery] monday fetch failed:', err);
    return { active_projects: 0, overdue_tasks: 0, tasks: [] };
  }
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { status: 'unavailable', message: 'unauthorized' },
      { status: 401 },
    );
  }

  const [clickupConnected, asanaConnected, mondayConnected] = await Promise.all([
    isComposioConnected(userId, 'clickup'),
    isComposioConnected(userId, 'asana'),
    isComposioConnected(userId, 'monday'),
  ]);

  if (!clickupConnected && !asanaConnected && !mondayConnected) {
    return NextResponse.json({ status: 'not_connected' });
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (redis) {
    const cached = await redis.get<DeliveryResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  const [clickupData, asanaData, mondayData] = await Promise.all([
    clickupConnected ? fetchClickupDelivery(userId) : Promise.resolve(null),
    asanaConnected ? fetchAsanaDelivery(userId) : Promise.resolve(null),
    mondayConnected ? fetchMondayDelivery(userId) : Promise.resolve(null),
  ]);

  const merged: DeliveryData = { active_projects: 0, overdue_tasks: 0, tasks: [] };
  for (const d of [clickupData, asanaData, mondayData]) {
    if (!d) continue;
    merged.active_projects += d.active_projects;
    merged.overdue_tasks += d.overdue_tasks;
    merged.tasks.push(...d.tasks);
  }

  const lastSyncedAt = new Date().toISOString();
  const payload: DeliveryResponse = {
    status: 'ok',
    data: merged,
    last_synced_at: lastSyncedAt,
    from_cache: false,
  };
  if (redis) await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(payload);
}
