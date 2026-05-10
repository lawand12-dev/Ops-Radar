import { NextRequest, NextResponse } from 'next/server';
import { fetchDashboardWidget } from '<npm>/lib/dashboard-fetch';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';

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
  const clientId = await getCurrentUserId();
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const fresh = req.nextUrl.searchParams.get('fresh') === '1';

  // Credentials live in n8n now — we pass only client_id.
  // Per-tool connection state is derived from `apollo_connected` /
  // `calendly_connected` in the n8n response.
  const result = await fetchDashboardWidget<MarketingWidgetData>({
    widget: 'marketing',
    clientId,
    n8nWorkflow: 'dashboard-marketing-apollo-calendly',
    payload: { client_id: clientId },
    fresh,
  });

  return NextResponse.json(result);
}
