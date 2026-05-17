const BASE = 'https://api.harvestapp.com/v2';
const UA = 'OpsRadar (https://opsradar.app)';

export type HarvestClientHours = {
  name: string;
  hours_current: number;
  hours_prior: number;
};

export type HarvestPerClientData = {
  clients: HarvestClientHours[];
};

function parseCombined(combined: string): { accountId: string; token: string } | null {
  const idx = combined.indexOf(':');
  if (idx <= 0 || idx === combined.length - 1) return null;
  return { accountId: combined.slice(0, idx).trim(), token: combined.slice(idx + 1).trim() };
}

function harvestHeaders(accountId: string, token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Harvest-Account-Id': accountId,
    'User-Agent': UA,
  };
}

type HarvestEntry = {
  hours: number;
  client?: { name?: string } | null;
};

type HarvestListResponse = {
  time_entries?: HarvestEntry[];
  next_page?: number | null;
};

async function fetchEntriesForRange(
  accountId: string,
  token: string,
  from: string,
  to: string,
): Promise<HarvestEntry[]> {
  const h = harvestHeaders(accountId, token);
  const params = new URLSearchParams({ from, to, per_page: '100' });
  const res = await fetch(`${BASE}/time_entries?${params}`, { headers: h });
  if (!res.ok) throw new Error(`Harvest time entries fetch failed: ${res.status}`);
  const body = (await res.json()) as HarvestListResponse;
  return body.time_entries ?? [];
}

export async function fetchHarvestPerClientHours(combined: string): Promise<HarvestPerClientData> {
  const parsed = parseCombined(combined);
  if (!parsed) throw new Error('Harvest credentials malformed');

  const now = new Date();
  const currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const priorStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const priorEnd = new Date(currentStart.getTime() - 86400_000);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const [currentEntries, priorEntries] = await Promise.all([
    fetchEntriesForRange(parsed.accountId, parsed.token, fmt(currentStart), fmt(now)),
    fetchEntriesForRange(parsed.accountId, parsed.token, fmt(priorStart), fmt(priorEnd)),
  ]);

  const aggregate = (entries: HarvestEntry[]): Map<string, number> => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const name = e.client?.name ?? 'No client';
      map.set(name, (map.get(name) ?? 0) + (Number(e.hours) || 0));
    }
    return map;
  };

  const currentMap = aggregate(currentEntries);
  const priorMap = aggregate(priorEntries);

  const allNames = new Set([...currentMap.keys(), ...priorMap.keys()]);
  const clients: HarvestClientHours[] = [];
  for (const name of allNames) {
    clients.push({
      name,
      hours_current: Math.round((currentMap.get(name) ?? 0) * 10) / 10,
      hours_prior: Math.round((priorMap.get(name) ?? 0) * 10) / 10,
    });
  }

  return { clients };
}
