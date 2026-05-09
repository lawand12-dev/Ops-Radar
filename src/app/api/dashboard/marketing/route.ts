import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { fetchDashboardWidget } from '<npm>/lib/dashboard-fetch';
import { getIntegrationToken, isIntegrationConnected } from '<npm>/lib/integrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type MarketingWidgetData = {
  emails_sent: number | null;
  open_rate_pct: number | null;
  reply_rate_pct: number | null;
  reply_sparkline: number[] | null;
  meetings_booked: number | null;
  meeting_conversion_pct: number | null;
  apollo_connected: boolean;
  calendly_connected: boolean;
  period_label: string;
};

export async function GET(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  const clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [apolloConnected, calendlyConnected] = await Promise.all([
    isIntegrationConnected(clientId, 'apollo'),
    isIntegrationConnected(clientId, 'calendly'),
  ]);

  if (!apolloConnected && !calendlyConnected) {
    return NextResponse.json({
      status: 'not_connected',
      apollo_connected: false,
      calendly_connected: false,
    });
  }

  const [apolloToken, calendlyToken] = await Promise.all([
    apolloConnected ? getIntegrationToken(clientId, 'apollo') : Promise.resolve(null),
    calendlyConnected ? getIntegrationToken(clientId, 'calendly') : Promise.resolve(null),
  ]);

  const fresh = req.nextUrl.searchParams.get('fresh') === '1';

  const result = await fetchDashboardWidget<MarketingWidgetData>({
    widget: 'marketing',
    clientId,
    n8nWorkflow: 'dashboard-marketing-apollo-calendly',
    payload: {
      apollo_token: apolloToken ?? '',
      calendly_token: calendlyToken ?? '',
      client_id: clientId,
    },
    fresh,
  });

  return NextResponse.json(result);
}
