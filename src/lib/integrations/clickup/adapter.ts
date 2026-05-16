import type { DeliveryTask, DeliveryData } from '<npm>/lib/integrations/delivery-types';

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

export async function validateClickupKey(token: string): Promise<AdapterValidation> {
  try {
    const res = await fetch('https://api.clickup.com/api/v2/user', {
      headers: { Authorization: token },
    });
    if (res.status === 401) {
      return { ok: false, reason: 'invalid_key', message: 'The token was rejected by ClickUp.' };
    }
    if (res.status === 403) {
      return { ok: false, reason: 'permission', message: 'ClickUp access denied — check token permissions.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `ClickUp returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { user?: { id?: number } };
    const userId = body?.user?.id;
    if (!userId) {
      return { ok: false, reason: 'network', message: 'ClickUp response missing user ID.' };
    }
    return { ok: true, externalAccountId: String(userId) };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'Could not reach ClickUp.',
    };
  }
}

type ClickupTeam = { id: string; name: string };
type ClickupTask = {
  id: string;
  name: string;
  status: { status: string };
  due_date: string | null;
  list?: { name?: string };
};

export async function fetchClickupDeliveryData(token: string): Promise<DeliveryData> {
  const headers = { Authorization: token };
  const now = Date.now();

  const teamsRes = await fetch('https://api.clickup.com/api/v2/team', { headers });
  if (!teamsRes.ok) throw new Error(`ClickUp teams fetch failed: ${teamsRes.status}`);
  const teamsData = (await teamsRes.json()) as { teams?: ClickupTeam[] };
  const teams = teamsData.teams ?? [];
  if (teams.length === 0) return { active_projects: 0, overdue_tasks: 0, tasks: [] };

  const teamId = teams[0].id;
  const tasksRes = await fetch(
    `https://api.clickup.com/api/v2/team/${teamId}/task?include_closed=false&subtasks=true&order_by=due_date&page=0`,
    { headers },
  );
  if (!tasksRes.ok) throw new Error(`ClickUp tasks fetch failed: ${tasksRes.status}`);
  const tasksData = (await tasksRes.json()) as { tasks?: ClickupTask[] };
  const rawTasks = tasksData.tasks ?? [];

  const tasks: DeliveryTask[] = rawTasks.slice(0, 50).map((t) => {
    const dueDateMs = t.due_date ? Number(t.due_date) : null;
    const overdue = dueDateMs !== null && dueDateMs < now;
    return {
      id: t.id,
      name: t.name,
      status: t.status?.status ?? 'open',
      due_date: dueDateMs ? new Date(dueDateMs).toISOString().slice(0, 10) : null,
      overdue,
      project_name: t.list?.name ?? 'No list',
      source: 'clickup' as const,
    };
  });

  const overdue_tasks = tasks.filter((t) => t.overdue).length;
  const active_projects = new Set(tasks.map((t) => t.project_name)).size;

  return { active_projects, overdue_tasks, tasks };
}
