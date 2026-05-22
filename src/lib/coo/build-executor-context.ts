// src/lib/coo/build-executor-context.ts
//
// Builds an ExecutorContext for a given user by loading their integration
// credentials + relevant profile metadata. Shared between the COO chat
// route (src/app/api/dashboard/coo/route.ts) and the MCP server route
// (src/app/api/mcp/route.ts).

import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import type { ExecutorContext } from '<npm>/lib/coo/executor';

const DEFAULT_BLENDED_RATE = 85;

export async function buildExecutorContext(
  userId: string,
  lastUserQuestion: string = '',
): Promise<ExecutorContext> {
  const service = getServerSupabaseClient();

  // User metadata (blended rate + team size for prompt context)
  let blendedRate = DEFAULT_BLENDED_RATE;
  let teamSizeRaw = '';
  try {
    const { data: { user } } = await service.auth.admin.getUserById(userId);
    if (user) {
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      if (typeof meta.blended_hourly_rate_usd === 'number') blendedRate = meta.blended_hourly_rate_usd;
      if (typeof meta.team_size === 'string') teamSizeRaw = meta.team_size;
    }
  } catch {
    // Use defaults if we can't load user
  }

  // Integration credentials, scoped to this user
  const { data: keyRows } = await service
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('status', 'connected');

  const getKey = (tool: string): string | null => {
    const row = (keyRows ?? []).find((r) => r.tool === tool);
    if (!row) return null;
    try {
      return decryptApiKey(row);
    } catch {
      return null;
    }
  };

  return {
    stripeKey: getKey('stripe'),
    hubspotKey: getKey('hubspot'),
    harvestKey: getKey('harvest'),
    clickupKey: getKey('clickup'),
    pipedriveKey: getKey('pipedrive'),
    togglKey: getKey('toggl'),
    asanaKey: getKey('asana'),
    mondayKey: getKey('monday'),
    apolloKey: getKey('apollo'),
    calendlyKey: getKey('calendly'),
    blendedRate,
    teamSizeRaw,
    userId,
    lastUserQuestion,
  };
}
