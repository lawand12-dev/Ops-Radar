import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { fetchDashboardWidget } from '<npm>/lib/dashboard-fetch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SalesWidgetData = {
  hubspot_connected: boolean;
  pipeline_value: number | null;
  new_leads: number | null;
  auto_leads: number | null;
  sparkline: number[] | null;
  period_label: string;
};

export async function GET(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  const clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const fresh = req.nextUrl.searchParams.get('fresh') === '1';

  // Credentials live in n8n now — we pass only client_id (for multi-tenant routing later).
  // Connection state is derived from `hubspot_connected` in the n8n response.
  const result = await fetchDashboardWidget<SalesWidgetData>({
    widget: 'sales',
    clientId,
    n8nWorkflow: 'dashboard-sales-hubspot',
    payload: { client_id: clientId },
    fresh,
  });

  return NextResponse.json(result);
}
