import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { getClientN8nConfig } from '<npm>/lib/client-n8n';
import { evalInvoiceReminders } from './evaluators/invoice-reminder';
import { evalMarginAlerts } from './evaluators/margin-alert';
import { evalHoursBudget } from './evaluators/hours-budget';
import { evalScopeApproaching } from './evaluators/scope-approaching';
import { evalWorkflowFailures } from './evaluators/workflow-failure';
import { evalHubSpotHarvest } from './evaluators/hubspot-harvest';
import { executeAction } from './executor';
import { ACTION_RISK } from './types';
import type { NewAction, AgentAction, UserContext } from './types';

const DEFAULT_BLENDED_RATE = 85;

async function insertAction(userId: string, action: NewAction): Promise<AgentAction | null> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('agent_actions')
    .insert({
      user_id: userId,
      action_type: action.action_type,
      status: 'pending',
      payload: action.payload as unknown as import('<npm>/lib/database.types').Json,
    })
    .select()
    .single();
  if (error || !data) {
    console.error('[insertAction] failed:', error);
    return null;
  }
  return data as AgentAction;
}

export async function evaluateActionsForUser(userId: string): Promise<void> {
  const supabase = getServerSupabaseClient();

  const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(userId);
  if (userErr || !user) return;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const ctx: UserContext = {
    userId,
    email: user.email ?? '',
    companyName: (meta.company_name as string | undefined) ?? '',
    blendedRate: typeof meta.blended_hourly_rate_usd === 'number'
      ? meta.blended_hourly_rate_usd
      : DEFAULT_BLENDED_RATE,
  };

  const { data: rows } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('status', 'connected');

  const getKey = (tool: string): string | null => {
    const row = (rows ?? []).find((r: { tool: string }) => r.tool === tool);
    try { return row ? decryptApiKey(row) : null; } catch { return null; }
  };

  const stripeKey  = getKey('stripe');
  const harvestKey = getKey('harvest');
  const hubspotKey = getKey('hubspot');
  const n8nConfig  = await getClientN8nConfig(userId);

  const results = await Promise.allSettled([
    stripeKey ? evalInvoiceReminders(ctx, stripeKey) : Promise.resolve([]),
    stripeKey && harvestKey ? evalMarginAlerts(ctx, stripeKey, harvestKey) : Promise.resolve([]),
    harvestKey ? evalHoursBudget(ctx, harvestKey) : Promise.resolve([]),
    harvestKey ? evalScopeApproaching(ctx, harvestKey) : Promise.resolve([]),
    n8nConfig ? evalWorkflowFailures(ctx, n8nConfig) : Promise.resolve([]),
    hubspotKey ? evalHubSpotHarvest(ctx, hubspotKey) : Promise.resolve([]),
  ]);

  const proposed: NewAction[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') proposed.push(...r.value);
  }

  for (const action of proposed) {
    const inserted = await insertAction(userId, action);
    if (!inserted) continue;

    if (ACTION_RISK[action.action_type] === 'auto') {
      await executeAction(inserted);
    }
  }
}
