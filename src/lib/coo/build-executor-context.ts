// src/lib/coo/build-executor-context.ts
//
// Builds an ExecutorContext for a given user. Post-Composio-OAuth this only
// needs the userId + profile metadata — per-tool credentials live in Composio
// and are resolved lazily inside the executor (`executeComposioAction`).
//
// Shared between the COO chat route (src/app/api/dashboard/coo/route.ts) and
// the MCP server route (src/app/api/mcp/route.ts).

import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
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

  return {
    userId,
    blendedRate,
    teamSizeRaw,
    lastUserQuestion,
  };
}
