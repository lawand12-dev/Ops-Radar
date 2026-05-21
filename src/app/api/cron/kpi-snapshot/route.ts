/**
 * KPI Snapshot cron — called by Vercel Cron once per day (e.g. 02:00 UTC).
 *
 * For each customer who has at least one connected integration, fetches live
 * data and writes a row to `kpi_snapshots`. Only computed metrics are stored —
 * no raw client data (invoices, deal records, etc.) ever touches Supabase.
 *
 * Vercel cron config (vercel.json):
 *   { "path": "/api/cron/kpi-snapshot", "schedule": "0 2 * * *" }
 *
 * Auth: Bearer CRON_SECRET header (same pattern as other cron routes).
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { fetchStripeFinanceData } from '<npm>/lib/integrations/stripe/adapter';
import { fetchHubspotSalesData } from '<npm>/lib/integrations/hubspot/adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

type SnapRow = {
  user_id: string;
  snapshot_date: string;
  invoiced_mtd_usd?: number | null;
  paid_mtd_usd?: number | null;
  overdue_usd?: number | null;
  pipeline_value_usd?: number | null;
  open_deals_count?: number | null;
  deals_won_mtd?: number | null;
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!CRON_SECRET) {
    console.error('[kpi-snapshot] missing CRON_SECRET');
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const snapshotDate = todayUtc();

  // Fetch all users with at least one active integration
  const { data: integrations, error } = await supabase
    .from('integrations')
    .select('client_id, tool, encrypted_token, iv, auth_tag')
    .eq('status', 'connected')
    .in('tool', ['stripe', 'hubspot']);

  if (error) {
    console.error('[kpi-snapshot] failed to load integrations:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  // Group by user
  const byUser: Record<string, typeof integrations> = {};
  for (const row of integrations ?? []) {
    (byUser[row.client_id] ??= []).push(row);
  }

  const results = { ok: 0, skipped: 0, errors: 0 };

  for (const [userId, rows] of Object.entries(byUser)) {
    const snap: SnapRow = { user_id: userId, snapshot_date: snapshotDate };

    const stripeRow = rows.find((r) => r.tool === 'stripe');
    const hubspotRow = rows.find((r) => r.tool === 'hubspot');

    // Stripe
    if (stripeRow?.encrypted_token) {
      try {
        const apiKey = decryptApiKey({
          encrypted_token: stripeRow.encrypted_token,
          iv: stripeRow.iv,
          auth_tag: stripeRow.auth_tag,
        });
        const data = await fetchStripeFinanceData(apiKey);
        snap.invoiced_mtd_usd = data.invoiced;
        snap.paid_mtd_usd = data.paid;
        snap.overdue_usd = data.overdue;
      } catch (err) {
        console.warn(`[kpi-snapshot] stripe failed for ${userId}:`, err);
      }
    }

    // HubSpot
    if (hubspotRow?.encrypted_token) {
      try {
        const token = decryptApiKey({
          encrypted_token: hubspotRow.encrypted_token,
          iv: hubspotRow.iv,
          auth_tag: hubspotRow.auth_tag,
        });
        const data = await fetchHubspotSalesData(token);
        snap.pipeline_value_usd = data.pipeline_value;
        snap.open_deals_count = data.open_deals_count;
        snap.deals_won_mtd = data.deals_won_this_month;
      } catch (err) {
        console.warn(`[kpi-snapshot] hubspot failed for ${userId}:`, err);
      }
    }

    // Skip if we got no data at all
    if (
      snap.invoiced_mtd_usd == null &&
      snap.pipeline_value_usd == null
    ) {
      results.skipped++;
      continue;
    }

    // Cast needed until `npm run types:supabase` is run after applying the migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertErr } = await (supabase as any)
      .from('kpi_snapshots')
      .upsert(snap, { onConflict: 'user_id,snapshot_date' });

    if (upsertErr) {
      console.error(`[kpi-snapshot] upsert failed for ${userId}:`, upsertErr);
      results.errors++;
    } else {
      results.ok++;
    }
  }

  console.log(`[kpi-snapshot] done: ${JSON.stringify(results)}`);
  return NextResponse.json({ date: snapshotDate, ...results });
}
