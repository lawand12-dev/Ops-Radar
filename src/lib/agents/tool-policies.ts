/**
 * Per-tool autonomy policy lookup.
 *
 * Each user can set a policy per Composio toolkit:
 *   ask  — default; writes queue for approval
 *   auto — writes execute immediately (still audited)
 *   off  — writes return an error to the model
 *
 * Reads always pass through regardless of policy (gate handles classification).
 *
 * Designed to be called once per agent run, then looked up in memory for each
 * tool call so we don't N+1-query the DB per Composio invocation.
 */

import { getServerSupabaseClient } from '<npm>/lib/supabase-server'

export type ToolPolicy = 'ask' | 'auto' | 'off'

export type ToolPolicyMap = Map<string, ToolPolicy>

const DEFAULT_POLICY: ToolPolicy = 'ask'

/**
 * Load all of the user's per-tool policies in one query. Returns a Map keyed
 * by tool_slug (the OpsRadar toolkit slug, e.g. 'gmail'). Missing entries
 * default to 'ask' at lookup time via getToolPolicy().
 */
export async function loadToolPolicies(userId: string): Promise<ToolPolicyMap> {
  const supabase = getServerSupabaseClient()
  // tool_policies isn't in generated types yet (created in 20260523 migration)
  // — minimal cast keeps the call typed without blocking on regen.
  const { data, error } = await (supabase
    .from('tool_policies' as unknown as 'agent_actions')
    .select('tool_slug, policy')
    .eq('user_id', userId)) as unknown as {
      data: Array<{ tool_slug: string; policy: string }> | null
      error: { message: string } | null
    }

  const map: ToolPolicyMap = new Map()
  if (error || !data) {
    if (error) console.warn('[tool-policies] load failed:', error.message)
    return map
  }
  for (const row of data) {
    if (row.policy === 'ask' || row.policy === 'auto' || row.policy === 'off') {
      map.set(row.tool_slug, row.policy)
    }
  }
  return map
}

/** Reads a single policy from a pre-loaded map, defaulting to 'ask'. */
export function getToolPolicy(map: ToolPolicyMap, toolSlug: string): ToolPolicy {
  return map.get(toolSlug.toLowerCase()) ?? DEFAULT_POLICY
}
