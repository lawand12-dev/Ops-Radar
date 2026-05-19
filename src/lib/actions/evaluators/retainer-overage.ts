// Retainer overage evaluator.
// Fires when a configured retainer client's logged hours exceed included hours
// by >= 2 hours and hasn't been alerted in the last 14 days (per dedup).
// Approval-required action — the founder reviews and sends the billing conversation.

import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import {
  computeRetainerHealth,
  type RetainerConfig,
} from '<npm>/lib/retainer';
import type { HarvestMonthlyProjectData } from '<npm>/lib/integrations/harvest/adapter';
import { fetchHarvestMonthlyProjectHours } from '<npm>/lib/integrations/harvest/adapter';
import { isDuplicate } from '../dedup';
import type { NewAction, RetainerOveragePayload, UserContext } from '../types';

function fmtMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function evalRetainerOverage(
  ctx: UserContext,
  harvestKey: string,
): Promise<NewAction[]> {
  const supabase = getServerSupabaseClient();
  const actions: NewAction[] = [];

  const { data: configRows } = await supabase
    .from('retainer_configs')
    .select('id, client_name_display, client_name_norm, monthly_amount_usd, included_hours')
    .eq('user_id', ctx.userId);

  if (!configRows || configRows.length === 0) return [];

  const configs: RetainerConfig[] = configRows.map((r) => ({
    id: r.id as string,
    client_name_display: r.client_name_display as string,
    client_name_norm: r.client_name_norm as string,
    monthly_amount_usd: Number(r.monthly_amount_usd),
    included_hours: Number(r.included_hours),
  }));

  let harvestData: HarvestMonthlyProjectData;
  try {
    harvestData = await fetchHarvestMonthlyProjectHours(harvestKey);
  } catch (err) {
    console.error('[retainer-overage] harvest fetch failed:', err);
    return [];
  }

  const { retainers } = computeRetainerHealth(configs, harvestData);

  for (const r of retainers) {
    if (r.status === 'on_track') continue;
    if (r.overage_hours < 2) continue; // suppress noisy small overages

    const dup = await isDuplicate(
      ctx.userId,
      'retainer_overage',
      'client_name_norm',
      r.config.client_name_norm,
    );
    if (dup) continue;

    const subject =
      `Retainer overage: ${r.config.client_name_display} — ${r.overage_hours}h over ` +
      `(${fmtMoney(r.overage_cost_usd)} unbilled)`;
    const body = `Hi,

We've tracked ${r.logged_hours} hours on ${r.config.client_name_display} this month against a ${r.config.included_hours}h retainer. That's ${r.overage_hours} hours over scope — about ${fmtMoney(r.overage_cost_usd)} at the implied ${fmtMoney(r.implied_hourly_rate)}/hour rate.

Three options:
1. Bill the overage: add a line item to this month's invoice.
2. Adjust the retainer: revisit scope with the client before next month.
3. Absorb it: note it now and watch the trend.

How would you like to handle this?

Best,
${ctx.companyName || 'OpsRadar'}`;

    const payload: RetainerOveragePayload = {
      client_name: r.config.client_name_display,
      client_name_norm: r.config.client_name_norm,
      monthly_amount_usd: r.config.monthly_amount_usd,
      included_hours: r.config.included_hours,
      logged_hours: r.logged_hours,
      overage_hours: r.overage_hours,
      overage_cost_usd: r.overage_cost_usd,
      implied_hourly_rate: r.implied_hourly_rate,
      draft_subject: subject,
      draft_body: body,
    };

    actions.push({ action_type: 'retainer_overage', payload });
  }

  return actions;
}
