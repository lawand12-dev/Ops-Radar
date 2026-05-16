export type PipedriveDealRow = {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  expected_close: string | null;
};

export type PipedriveSalesData = {
  pipeline_value: number;
  open_deals_count: number;
  deals_won_this_month: number;
  rows: PipedriveDealRow[];
  currency: string;
};

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

const BASE = 'https://api.pipedrive.com/v1';

export async function validatePipedriveKey(apiKey: string): Promise<AdapterValidation> {
  try {
    const res = await fetch(`${BASE}/users/me?api_token=${encodeURIComponent(apiKey)}`);
    if (res.status === 401) {
      return { ok: false, reason: 'invalid_key', message: 'Pipedrive rejected the token.' };
    }
    if (res.status === 403) {
      return { ok: false, reason: 'permission', message: 'Pipedrive token lacks required permissions.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `Pipedrive returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { data?: { id?: number; company_id?: number } };
    const accountId = body?.data?.company_id ?? body?.data?.id;
    if (!accountId) {
      return { ok: false, reason: 'network', message: 'Pipedrive response missing user/company id.' };
    }
    return { ok: true, externalAccountId: String(accountId) };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'Could not reach Pipedrive.',
    };
  }
}

type PipedriveDeal = {
  id: number;
  title: string;
  value: number;
  currency: string;
  status: string;
  stage_id?: number;
  expected_close_date?: string | null;
  won_time?: string | null;
};

type PipedriveStage = { id: number; name: string };

export async function fetchPipedriveSalesData(apiKey: string): Promise<PipedriveSalesData> {
  const auth = `api_token=${encodeURIComponent(apiKey)}`;

  const [openRes, wonRes, stagesRes] = await Promise.all([
    fetch(`${BASE}/deals?status=open&limit=100&${auth}`),
    fetch(`${BASE}/deals?status=won&limit=100&${auth}`),
    fetch(`${BASE}/stages?${auth}`),
  ]);

  if (!openRes.ok) throw new Error(`Pipedrive open deals fetch failed: ${openRes.status}`);
  const openData = (await openRes.json()) as { data?: PipedriveDeal[] | null };
  const openDeals = openData.data ?? [];

  const wonData = wonRes.ok
    ? ((await wonRes.json()) as { data?: PipedriveDeal[] | null })
    : { data: [] };
  const wonDeals = wonData.data ?? [];

  const stagesData = stagesRes.ok
    ? ((await stagesRes.json()) as { data?: PipedriveStage[] | null })
    : { data: [] };
  const stageNameById = new Map<number, string>(
    (stagesData.data ?? []).map((s) => [s.id, s.name]),
  );

  const pipelineValue = openDeals.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const openDealsCount = openDeals.length;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const dealsWonThisMonth = wonDeals.filter(
    (d) => d.won_time && new Date(d.won_time) >= monthStart,
  ).length;

  const currency = openDeals[0]?.currency ?? 'USD';

  const rows: PipedriveDealRow[] = openDeals
    .slice()
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
    .slice(0, 5)
    .map((d) => ({
      id: String(d.id),
      title: d.title,
      value: Number(d.value) || 0,
      currency: d.currency ?? currency,
      stage: d.stage_id != null ? (stageNameById.get(d.stage_id) ?? `Stage ${d.stage_id}`) : 'unknown',
      expected_close: d.expected_close_date ?? null,
    }));

  return { pipeline_value: pipelineValue, open_deals_count: openDealsCount, deals_won_this_month: dealsWonThisMonth, rows, currency };
}
