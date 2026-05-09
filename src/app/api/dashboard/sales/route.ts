import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { fetchDashboardWidget } from '<npm>/lib/dashboard-fetch';
import { getIntegrationToken, isIntegrationConnected } from '<npm>/lib/integrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SalesWidgetData = {
  pipeline_value: number;
  new_leads: number;
  auto_leads: number;
  sparkline: number[];
  period_label: string;
};

export async function GET(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  const clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Connection check first — distinguishes "not connected" from "errored"
  const connected = await isIntegrationConnected(clientId, 'hubspot');
  if (!connected) {
    return NextResponse.json({ status: 'not_connected', tool: 'hubspot' });
  }

  const hubspotToken = await getIntegrationToken(clientId, 'hubspot');
  if (!hubspotToken) {
    return NextResponse.json({ status: 'not_connected', tool: 'hubspot' });
  }

  const fresh = req.nextUrl.searchParams.get('fresh') === '1';

  const result = await fetchDashboardWidget<SalesWidgetData>({
    widget: 'sales',
    clientId,
    n8nWorkflow: 'dashboard-sales-hubspot',
    payload: { hubspot_token: hubspotToken, client_id: clientId },
    fresh,
  });

  return NextResponse.json(result);
}
