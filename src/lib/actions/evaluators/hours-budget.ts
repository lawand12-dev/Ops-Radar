import { openai } from '<npm>/lib/openai';
import { isDuplicate } from '../dedup';
import type { NewAction, HoursBudgetPayload, UserContext } from '../types';

const HARVEST_BASE = 'https://api.harvestapp.com/v2';
const UA = 'OpsRadar (https://opsradar.app)';

function parseCombined(combined: string): { accountId: string; token: string } | null {
  const idx = combined.indexOf(':');
  if (idx <= 0 || idx === combined.length - 1) return null;
  return { accountId: combined.slice(0, idx).trim(), token: combined.slice(idx + 1).trim() };
}

type HarvestProject = {
  id: number;
  name: string;
  budget: number | null;
  budget_by: string;
  is_active: boolean;
  client: { id: number; name: string } | null;
};

type HarvestTimeEntry = { hours: number };

async function fetchProjects(accountId: string, token: string): Promise<HarvestProject[]> {
  const h = {
    Authorization: `Bearer ${token}`,
    'Harvest-Account-Id': accountId,
    'User-Agent': UA,
  };
  const res = await fetch(`${HARVEST_BASE}/projects?is_active=true&per_page=50`, { headers: h });
  if (!res.ok) throw new Error(`Harvest projects fetch failed: ${res.status}`);
  const body = (await res.json()) as { projects?: HarvestProject[] };
  return body.projects ?? [];
}

async function sumProjectHoursThisMonth(accountId: string, token: string, projectId: number): Promise<number> {
  const h = {
    Authorization: `Bearer ${token}`,
    'Harvest-Account-Id': accountId,
    'User-Agent': UA,
  };
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  const params = new URLSearchParams({ project_id: String(projectId), from, to, per_page: '100' });
  const res = await fetch(`${HARVEST_BASE}/time_entries?${params}`, { headers: h });
  if (!res.ok) return 0;
  const body = (await res.json()) as { time_entries?: HarvestTimeEntry[] };
  return (body.time_entries ?? []).reduce((s, e) => s + (Number(e.hours) || 0), 0);
}

async function draftScopeEmail(
  ctx: UserContext,
  clientName: string,
  projectName: string,
  hoursLogged: number,
  budgetHours: number,
): Promise<{ subject: string; body: string }> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a professional project manager. Output strict JSON only.' },
      {
        role: 'user',
        content: `Write a scope conversation email to a client.

Agency: ${ctx.companyName || 'our agency'}
Client: ${clientName}
Project: ${projectName}
Hours used: ${hoursLogged.toFixed(1)} / ${budgetHours} budgeted (${Math.round((hoursLogged / budgetHours) * 100)}% used)

Return JSON: { "subject": "...", "body": "..." }
Rules:
- subject: mentions the project name, professional
- body: 3 paragraphs, explains budget status, proposes options (scope adjustment or additional budget), warm tone
- Sign off as "${ctx.companyName || 'the team'}"`,
      },
    ],
    temperature: 0.4,
  });
  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as { subject?: string; body?: string };
  return {
    subject: parsed.subject ?? `${projectName} — hours update`,
    body: parsed.body ?? `Hi ${clientName},\n\nI wanted to flag that we've reached the budgeted hours for ${projectName}. Let's discuss how to proceed.\n\n${ctx.companyName}`,
  };
}

export async function evalHoursBudget(
  ctx: UserContext,
  harvestApiKey: string,
): Promise<NewAction[]> {
  const parsed = parseCombined(harvestApiKey);
  if (!parsed) return [];

  let projects: HarvestProject[];
  try {
    projects = await fetchProjects(parsed.accountId, parsed.token);
  } catch (err) {
    console.warn('[evalHoursBudget] projects fetch failed:', err);
    return [];
  }

  const budgetedProjects = projects.filter(
    (p) => p.budget_by === 'project' && typeof p.budget === 'number' && p.budget > 0,
  );

  const actions: NewAction[] = [];

  for (const project of budgetedProjects.slice(0, 20)) {
    const budget = project.budget as number;
    let hoursLogged: number;
    try {
      hoursLogged = await sumProjectHoursThisMonth(parsed.accountId, parsed.token, project.id);
    } catch {
      continue;
    }
    if (hoursLogged <= budget) continue;

    const projectIdStr = String(project.id);
    const dup = await isDuplicate(ctx.userId, 'hours_budget_exceeded', 'harvest_project_id', projectIdStr);
    if (dup) continue;

    const clientName = project.client?.name ?? 'Unknown client';
    const overage = Math.round(((hoursLogged - budget) / budget) * 100);

    let draft: { subject: string; body: string };
    try {
      draft = await draftScopeEmail(ctx, clientName, project.name, hoursLogged, budget);
    } catch {
      draft = {
        subject: `${project.name} — hours update`,
        body: `Hi ${clientName},\n\nWe've used ${hoursLogged.toFixed(1)} of the ${budget} budgeted hours for ${project.name}. Let's connect to discuss next steps.\n\n${ctx.companyName}`,
      };
    }

    const payload: HoursBudgetPayload = {
      client_name: clientName,
      project_name: project.name,
      harvest_project_id: projectIdStr,
      hours_logged: Math.round(hoursLogged * 10) / 10,
      budget_hours: budget,
      overage_pct: overage,
      draft_subject: draft.subject,
      draft_body: draft.body,
    };
    actions.push({ action_type: 'hours_budget_exceeded', payload });
  }

  return actions;
}
