export type HarvestProjectRow = {
  project_name: string;
  hours: number;
  client_name: string | null;
};

export type HarvestTimeData = {
  hours_tracked: number;
  utilization_pct: number | null;
  by_project: HarvestProjectRow[];
  period_label: string;
};

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

const BASE = 'https://api.harvestapp.com/v2';
const UA = 'OpsRadar (https://opsradar.app)';

function parseCombined(combined: string): { accountId: string; token: string } | null {
  const idx = combined.indexOf(':');
  if (idx <= 0 || idx === combined.length - 1) return null;
  const accountId = combined.slice(0, idx).trim();
  const token = combined.slice(idx + 1).trim();
  if (!accountId || !token) return null;
  return { accountId, token };
}

function headers(accountId: string, token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Harvest-Account-Id': accountId,
    'User-Agent': UA,
  };
}

export async function validateHarvestKey(combined: string): Promise<AdapterValidation> {
  const parsed = parseCombined(combined);
  if (!parsed) {
    return {
      ok: false,
      reason: 'invalid_key',
      message: 'Expected format: <account_id>:<token>',
    };
  }
  try {
    const res = await fetch(`${BASE}/users/me`, { headers: headers(parsed.accountId, parsed.token) });
    if (res.status === 401) {
      return { ok: false, reason: 'invalid_key', message: 'Harvest rejected the token.' };
    }
    if (res.status === 403) {
      return { ok: false, reason: 'permission', message: 'Token lacks required scopes.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `Harvest returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { id?: number };
    if (!body.id) {
      return { ok: false, reason: 'network', message: 'Harvest response missing user id.' };
    }
    return { ok: true, externalAccountId: parsed.accountId };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'Could not reach Harvest.',
    };
  }
}

type HarvestEntry = {
  hours: number;
  project?: { name?: string } | null;
  client?: { name?: string } | null;
};

export async function fetchHarvestTimeData(combined: string): Promise<HarvestTimeData> {
  const parsed = parseCombined(combined);
  if (!parsed) throw new Error('Harvest credentials malformed');
  const h = headers(parsed.accountId, parsed.token);

  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - daysFromMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const params = new URLSearchParams({
    from: weekStart.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
    user_id: 'me',
    per_page: '100',
  });

  const res = await fetch(`${BASE}/time_entries?${params}`, { headers: h });
  if (!res.ok) throw new Error(`Harvest time entries fetch failed: ${res.status}`);
  const body = (await res.json()) as { time_entries?: HarvestEntry[] };
  const entries = body.time_entries ?? [];

  const totalHours = entries.reduce((s, e) => s + (Number(e.hours) || 0), 0);
  const hours_tracked = Math.round(totalHours * 10) / 10;
  const utilization_pct = hours_tracked > 0 ? Math.round((hours_tracked / 40) * 1000) / 10 : null;

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
