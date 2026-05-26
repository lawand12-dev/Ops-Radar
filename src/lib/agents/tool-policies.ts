/**
 * Per-tool autonomy policy (CP-14).
 *
 * Each customer can flip each toolkit between three modes:
 *   - 'ask'  — destructive writes go to the approval queue (default)
 *   - 'auto' — destructive writes fire immediately, audit-logged
 *   - 'off'  — destructive writes refused outright
 *
 * The policy is keyed by **toolkit slug** (e.g. 'gmail', 'hubspot'), not by
 * individual tool name. The destructive-vs-readonly check stays in
 * src/lib/agents/hooks.ts; this file just answers "what's the policy for
 * this toolkit on this customer?"
 *
 * Loaded once at runAgent start, cached in-memory for the duration of the
 * run. Updates from /dashboard/settings/automation only take effect on the
 * next run — cheap, predictable, easy to reason about.
 */

import { getServerSupabaseClient } from '<npm>/lib/supabase-server'

export type ToolPolicy = 'ask' | 'auto' | 'off'

export type ToolPolicyMap = Record<string, ToolPolicy>

/**
 * Load the full policy map for a user. Missing rows default to 'ask'.
 */
export async function loadToolPolicies(userId: string): Promise<ToolPolicyMap> {
  try {
    const supabase = getServerSupabaseClient()
    const { data, error } = await (supabase
      .from('tool_policies' as unknown as 'agent_actions')
      .select('tool_slug, policy')
      .eq('user_id', userId)) as unknown as {
        data: Array<{ tool_slug: string; policy: ToolPolicy }> | null
        error: { message: string } | null
      }

    if (error) {
      console.warn('[tool-policies] load failed:', error.message)
      return {}
    }

    const map: ToolPolicyMap = {}
    for (const row of data ?? []) {
      map[row.tool_slug] = row.policy
    }
    return map
  } catch (err) {
    console.warn('[tool-policies] threw:', err)
    return {}
  }
}

/**
 * Resolve the policy for a specific tool call. Tool names follow the
 * convention `<toolkit>_<verb>` (e.g. 'gmail_send' → toolkit 'gmail').
 *
 * Resolution order:
 *   1. Per-toolkit row in tool_policies table (if set)
 *   2. Global default passed in (used by employee chat "test mode")
 *   3. 'ask' (system default)
 */
export function resolvePolicyForTool({
  toolName,
  policies,
  globalDefault = 'ask',
}: {
  toolName: string
  policies: ToolPolicyMap
  globalDefault?: ToolPolicy
}): ToolPolicy {
  const [toolkit] = toolName.split('_')
  if (toolkit && policies[toolkit]) return policies[toolkit]
  return globalDefault
}
