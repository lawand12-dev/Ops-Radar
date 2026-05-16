export type TogglTimeData = {
  hours_tracked: number;
  utilization_pct: number | null;
  by_project: Array<{
    project_name: string;
    hours: number;
    color: string;
  }>;
  period_label: string;
};

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

function basicAuth(apiToken: string): string {
  return `Basic ${Buffer.from(`${apiToken}:api_token`).toString('base64')}`;
}

export async function validateTogglToken(apiToken: string): Promise<AdapterValidation> {
  try {
    const res = await fetch('https://api.track.toggl.com/api/v9/me', {
      headers: { Authorization: basicAuth(apiToken) },
    });
    if (res.status === 403) {
      return { ok: false, reason: 'invalid_key', message: 'The API token was rejected by Toggl.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `Toggl returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { id?: number };
    if (!body.id) {
      return { ok: false, reason: 'network', message: 'Toggl response missing user ID.' };
    }
    return { ok: true, externalAccountId: String(body.id) };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'Could not reach Toggl.',
    };
  }
}

type TogglTimeEntry = {
  workspace_id: number;
  project_id: number | null;
  duration: number;
};
type TogglProject = { id: number; name: string; color: string };
type TogglMe = { id?: number; default_workspace_id?: number };

export async function fetchTogglTimeData(apiToken: string): Promise<TogglTimeData> {
  const auth = basicAuth(apiToken);
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - daysFromMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const params = new URLSearchParams({
    start_date: weekStart.toISOString().slice(0, 10),
    end_date: now.toISOString().slice(0, 10),
  });

  const [entriesRes, meRes] = await Promise.all([
    fetch(`https://api.track.toggl.com/api/v9/me/time_entries?${params}`, {
      headers: { Authorization: auth },
    }),
    fetch('https://api.track.toggl.com/api/v9/me', { headers: { Authorization: auth } }),
  ]);

  if (!entriesRes.ok) throw new Error(`Toggl time entries fetch failed: ${entriesRes.status}`);
  const entries = (await entriesRes.json()) as TogglTimeEntry[];
  const me = meRes.ok ? ((await meRes.json()) as TogglMe) : null;
  const workspaceId = me?.default_workspace_id;

  const completed = entries.filter((e) => e.duration > 0);
  const totalSeconds = completed.reduce((s, e) => s + e.duration, 0);
  const hours_tracked = Math.round((totalSeconds / 3600) * 10) / 10;
  const utilization_pct =
    hours_tracked > 0 ? Math.round((hours_tracked / 40) * 1000) / 10 : null;

  const byProjectId: Record<string, number> = {};
  for (const e of completed) {
    const key = e.project_id != null ? String(e.project_id) : '__none__';
    byProjectId[key] = (byProjectId[key] ?? 0) + e.duration;
  }

  let projects: TogglProject[] = [];
  if (workspaceId) {
    try {
      const projRes = await fetch(
        `https://api.track.toggl.com/api/v9/workspaces/${workspaceId}/projects?active=true`,
        { headers: { Authorization: auth } },
      );
      if (projRes.ok) projects = (await projRes.json()) as TogglProject[];
    } catch { /* project names fall back to ID */ }
  }
  const projectById = new Map(projects.map((p) => [String(p.id), p]));

  const by_project = Object.entries(byProjectId)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([pid, secs]) => {
      const proj = projectById.get(pid);
      return {
        project_name: proj?.name ?? (pid === '__none__' ? 'No project' : `Project ${pid}`),
        hours: Math.round((secs / 3600) * 10) / 10,
        color: proj?.color ?? '#6b7280',
      };
    });

  return { hours_tracked, utilization_pct, by_project, period_label: 'This week' };
}
