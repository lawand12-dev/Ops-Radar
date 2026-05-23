import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { getClientN8nConfig } from '<npm>/lib/client-n8n';
import { evalWorkflowFailures } from './evaluators/workflow-failure';
import { evalHubSpotHarvest } from './evaluators/hubspot-harvest';
import { evalRetainerInvoiceDraft } from './evaluators/retainer-invoice-draft';
import { executeAction } from './executor';
import { ACTION_RISK } from './types';
import type { NewAction, AgentAction, UserContext } from './types';
import { hasQuotaRemaining } from './usage';
import { dispatchEvent } from '<npm>/lib/webhooks/dispatch';
import { getRecentOutcomes } from '<npm>/lib/coo/outcomes';

const DISMISSAL_COOLDOWN_DAYS = 14;

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
  const hubspotKey = getKey('hubspot');
  const n8nConfig  = await getClientN8nConfig(userId);

  // TODO(post-cleanup): the deleted evaluators (cash-flow, capacity-drift,
  // margin-alert, retainer-overage, scope-approaching, hours-budget,
  // invoice-reminder, pattern-alert) were absorbed into the per-domain agents
  // under src/lib/agents/* and now run on their own crons. The orchestrator
  // below keeps only the evaluators that have not yet been migrated.
  const results = await Promise.allSettled([
    n8nConfig ? evalWorkflowFailures(ctx, n8nConfig) : Promise.resolve([]),
    hubspotKey ? evalHubSpotHarvest(ctx, hubspotKey) : Promise.resolve([]),
    stripeKey ? evalRetainerInvoiceDraft(ctx, stripeKey) : Promise.resolve([]),
  ]);

  const proposed: NewAction[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') proposed.push(...r.value);
  }

  // Outcome-memory loop: skip action types the owner has DISMISSED within
  // the last DISMISSAL_COOLDOWN_DAYS days. Prevents re-proposing the same
  // pattern the owner just rejected — turns the COO from "noisy" to "smart".
  const recentOutcomes = await getRecentOutcomes(userId, 50);
  const cutoff = Date.now() - DISMISSAL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const recentlyDismissed = new Set(
    recentOutcomes
      .filter((o) => o.decision === 'dismissed' && new Date(o.decided_at).getTime() > cutoff)
      .map((o) => o.action_type),
  );

  for (const action of proposed) {
    if (recentlyDismissed.has(action.action_type)) {
      console.log(
        '[evaluator] skipping recently-dismissed action_type',
        action.action_type,
        'for',
        userId,
      );
      continue;
    }

    // Enforce per-tier monthly quota. Starter has quota 0 (blocks all actions);
    // Growth = 50, Pro = 200, FO = unlimited. Quota covers all action_types together.
    const allowed = await hasQuotaRemaining(userId);
    if (!allowed) {
      console.log('[evaluator] quota exhausted, skipping action', action.action_type, 'for', userId);
      break;
    }

    const inserted = await insertAction(userId, action);
    if (!inserted) continue;

    // Fire generic action.created webhook event
    await dispatchEvent(userId, 'action.created', {
      action_id: inserted.id,
      action_type: inserted.action_type,
      payload: action.payload as unknown as Record<string, unknown>,
    });

    // Fire specific event types for retainer + scope so customers can route them differently
    if (inserted.action_type === 'retainer_overage') {
      await dispatchEvent(userId, 'retainer.overage_detected', {
        action_id: inserted.id,
        payload: action.payload as unknown as Record<string, unknown>,
      });
    } else if (inserted.action_type === 'scope_approaching') {
      await dispatchEvent(userId, 'scope.at_risk', {
        action_id: inserted.id,
        payload: action.payload as unknown as Record<string, unknown>,
      });
    }

    if (ACTION_RISK[action.action_type] === 'auto') {
      await executeAction(inserted);
    }
  }
}
