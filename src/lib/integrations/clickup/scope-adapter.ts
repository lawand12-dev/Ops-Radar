// src/lib/integrations/clickup/scope-adapter.ts

const BASE = 'https://api.clickup.com/api/v2';

export type ClickupProjectBudget = {
  project_name: string;
  estimated_hours: number;
};

export type ClickupScopeData = {
  projects: ClickupProjectBudget[];
};

type ScopeTask = {
  time_estimate?: number | null;
  list?: { name?: string } | null;
};

export async function fetchClickupProjectBudgets(token: string): Promise<ClickupScopeData> {
  const h = { Authorization: token };

  const teamsRes = await fetch(`${BASE}/team`, { headers: h });
  if (!teamsRes.ok) throw new Error(`ClickUp teams fetch failed: ${teamsRes.status}`);
  const teamsData = (await teamsRes.json()) as { teams?: { id: string }[] };
  const teams = teamsData.teams ?? [];
  if (teams.length === 0) return { projects: [] };

  const teamId = teams[0].id;
  const tasksRes = await fetch(
    `${BASE}/team/${teamId}/task?include_closed=true&subtasks=true&per_page=100`,
    { headers: h },
  );
  if (!tasksRes.ok) throw new Error(`ClickUp tasks fetch failed: ${tasksRes.status}`);
  const tasksData = (await tasksRes.json()) as { tasks?: ScopeTask[] };
  const tasks = tasksData.tasks ?? [];

  const budgetMap = new Map<string, number>();
  for (const task of tasks) {
    const name = task.list?.name ?? 'No project';
    const estimateMs = typeof task.time_estimate === 'number' ? task.time_estimate : 0;
    budgetMap.set(name, (budgetMap.get(name) ?? 0) + estimateMs / 3_600_000);
  }

  const projects: ClickupProjectBudget[] = [...budgetMap.entries()]
    .filter(([, hours]) => hours > 0)
    .map(([project_name, hours]) => ({
      project_name,
      estimated_hours: Math.round(hours * 10) / 10,
    }))
    .sort((a, b) => b.estimated_hours - a.estimated_hours);

  return { projects };
}
