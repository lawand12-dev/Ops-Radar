import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { fetchDashboardWidget } from '<npm>/lib/dashboard-fetch';
import { getClientN8nConfig } from '<npm>/lib/client-n8n';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export type MetricsData = {
  revenue: { total: number; weekly: number[] };
  invoiced: { total: number; paid: number; overdue: number };
  hours_tracked: { total: number; weekly: number[] };
  active_projects: { count: number };
  tasks: { completed: number; in_progress: number; todo: number };
  profit_margin_pct: number | null;
  period_label: string;
  sources_connected: string[];
  backfill_pending: boolean;
};

const ALLOWED_PERIODS = [7, 14, 30, 90];

export async function GET(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  const clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const n8nConfig = await getClientN8nConfig(clientId);
  if (!n8nConfig) {
    return NextResponse.json(
      { status: 'error', message: 'n8n not configured for this client' },
      { status: 503 }
    );
  }

  const fresh = req.nextUrl.searchParams.get('fresh') === '1';
  const rawPeriod = Number(req.nextUrl.searchParams.get('period_days') ?? '30');
  const periodDays = ALLOWED_PERIODS.includes(rawPeriod) ? rawPeriod : 30;

  const result = await fetchDashboardWidget<MetricsData>({
    widget: 'metrics',
    clientId,
    n8nWorkflow: 'opsradar-dashboard-metrics',
    payload: { client_id: clientId, period_days: periodDays },
    fresh,
    n8nBaseUrl: n8nConfig.n8nBaseUrl,
    n8nWebhookSecret: n8nConfig.n8nWebhookSecret,
  });

  if (result.status === 'ok') {
    result.data.backfill_pending = n8nConfig.backfillCompletedAt === null;
  }

  return NextResponse.json(result);
}
