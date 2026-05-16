import type { DeliveryTask, DeliveryData } from '<npm>/lib/integrations/delivery-types';

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

export async function validateAsanaToken(token: string): Promise<AdapterValidation> {
  try {
    const res = await fetch('https://app.asana.com/api/1.0/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      return { ok: false, reason: 'invalid_key', message: 'The token was rejected by Asana.' };
    }
    if (res.status === 403) {
      return { ok: false, reason: 'permission', message: 'The token lacks required permissions.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `Asana returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { data?: { gid?: string } };
    const gid = body?.data?.gid;
    if (!gid) {
      return { ok: false, reason: 'network', message: 'Asana response missing user GID.' };
    }
    return { ok: true, externalAccountId: gid };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'Could not reach Asana.',
    };
  }
}

type AsanaWorkspace = { gid: string; name: string };
type AsanaTask = {
  gid: string;
  name: string;
  completed: boolean;
  due_on: string | null;
  memberships?: Array<{ project?: { name?: string } }>;
};

export async function fetchAsanaDeliveryData(token: string): Promise<DeliveryData> {
  const headers = { Authorization: `Bearer ${token}` };
  const today = new Date().toISOString().slice(0, 10);

  const wsRes = await fetch('https://app.asana.com/api/1.0/workspaces', { headers });
  if (!wsRes.ok) throw new Error(`Asana workspaces fetch failed: ${wsRes.status}`);
  const wsData = (await wsRes.json()) as { data?: AsanaWorkspace[] };
  const workspaces = wsData.data ?? [];
  if (workspaces.length === 0) return { active_projects: 0, overdue_tasks: 0, tasks: [] };

  const wsGid = workspaces[0].gid;
  const params = new URLSearchParams({
    workspace: wsGid,
    assignee: 'me',
    completed_since: 'now',
    opt_fields: 'name,completed,due_on,memberships.project.name',
    limit: '50',
  });
  const tasksRes = await fetch(`https://app.asana.com/api/1.0/tasks?${params}`, { headers });
  if (!tasksRes.ok) throw new Error(`Asana tasks fetch failed: ${tasksRes.status}`);
  const tasksData = (await tasksRes.json()) as { data?: AsanaTask[] };
  const rawTasks = tasksData.data ?? [];

  const tasks: DeliveryTask[] = rawTasks.map((t) => ({
    id: t.gid,
    name: t.name,
    status: t.completed ? 'complete' : 'incomplete',
    due_date: t.due_on,
    overdue: t.due_on !== null && t.due_on < today,
    project_name: t.memberships?.[0]?.project?.name ?? 'No project',
    source: 'asana' as const,
  }));

  const overdue_tasks = tasks.filter((t) => t.overdue).length;
  const active_projects = new Set(tasks.map((t) => t.project_name)).size;

  return { active_projects, overdue_tasks, tasks };
}
