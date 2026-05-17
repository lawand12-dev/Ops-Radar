import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import type { ProfitabilityResult } from '<npm>/lib/profitability';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export type Alert = {
  kind: 'overdue_invoice' | 'negative_margin' | 'thin_margin';
  severity: 'alert' | 'warning';
  message: string;
  client?: string;
};

type AlertsResponse =
  | { status: 'ok'; alerts: Alert[] }
  | { status: 'unavailable'; message: string };

export async function GET(request: NextRequest): Promise<NextResponse<AlertsResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const cookieHeader = request.headers.get('cookie') ?? '';

  let profData: { status: string; data?: ProfitabilityResult } | null = null;
  try {
    const r = await fetch(`${origin}/api/dashboard/profitability`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
    profData = await r.json() as { status: string; data?: ProfitabilityResult };
  } catch {
    // Profitability unavailable — return empty alerts, not an error
  }

  const alerts: Alert[] = [];

  if (profData?.status === 'ok' && profData.data) {
    for (const client of profData.data.clients) {
      if (
        client.payment_status === 'overdue' &&
        (client.days_overdue ?? 0) > 14 &&
        client.revenue_mtd > 2000
      ) {
        alerts.push({
          kind: 'overdue_invoice',
          severity: 'alert',
          message: `${client.name} has an invoice ${client.days_overdue} days overdue (${fmtMoney(client.revenue_mtd)}).`,
          client: client.name,
        });
      }

      if (client.hours_mtd > 0 && client.margin_pct < 0) {
        alerts.push({
          kind: 'negative_margin',
          severity: 'alert',
          message: `${client.name} is unprofitable this month: ${Math.round(client.margin_pct)}% margin.`,
          client: client.name,
        });
      }

      if (
        client.hours_mtd > 0 &&
        client.margin_pct >= 0 &&
        client.margin_pct < 15 &&
        client.revenue_mtd > 1000
      ) {
        alerts.push({
          kind: 'thin_margin',
          severity: 'warning',
          message: `${client.name} margin is only ${Math.round(client.margin_pct)}% — consider reviewing scope or rate.`,
          client: client.name,
        });
      }
    }
  }

  return NextResponse.json({ status: 'ok', alerts });
}

function fmtMoney(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}
