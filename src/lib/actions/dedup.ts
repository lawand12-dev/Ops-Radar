import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import type { ActionType } from './types';

const LOOKBACK_MS: Record<ActionType, number> = {
  invoice_reminder:      7  * 24 * 60 * 60 * 1000,
  margin_alert:          7  * 24 * 60 * 60 * 1000,
  hours_budget_exceeded: 7  * 24 * 60 * 60 * 1000,
  scope_approaching:     7  * 24 * 60 * 60 * 1000,
  workflow_failure:      24 *      60 * 60 * 1000,
  hubspot_harvest_sync:  30 * 24 * 60 * 60 * 1000,
  retainer_overage:      14 * 24 * 60 * 60 * 1000,
  retainer_invoice_draft: 31 * 24 * 60 * 60 * 1000, // one draft per client per month
  cash_flow_alert:       30 * 24 * 60 * 60 * 1000, // one per agency per month
  capacity_drift:        7  * 24 * 60 * 60 * 1000, // one per direction per week
};

export async function isDuplicate(
  userId: string,
  actionType: ActionType,
  identityKey: string,
  identityValue: string,
): Promise<boolean> {
  const supabase = getServerSupabaseClient();
  const cutoff = new Date(Date.now() - LOOKBACK_MS[actionType]).toISOString();

  const { data } = await supabase
    .from('agent_actions')
    .select('id, payload')
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .in('status', ['pending', 'executed'])
    .gte('created_at', cutoff);

  return (data ?? []).some((row) => {
    const p = (row.payload ?? {}) as Record<string, unknown>;
    return String(p[identityKey] ?? '') === identityValue;
  });
}
