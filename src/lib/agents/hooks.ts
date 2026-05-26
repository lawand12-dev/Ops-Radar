/**
 * Agent hooks — Tier 1–3 capabilities wired around the runAgent loop.
 *
 * This module is intentionally a flat collection of small, single-purpose
 * functions. The loop (src/lib/agents/loop.ts) calls them at specific
 * lifecycle moments. Each function is independently testable and replaceable.
 *
 * Lifecycle:
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  startRun()         → insert agent_runs row, get runId  │
 *   │  loadBrainContext() → return system-prompt snippet      │
 *   │  classifyToolCall() → decide auto / approval / blocked  │
 *   │  enqueueAction()    → insert agent_actions row          │
 *   │  finishRun()        → update agent_runs with outcome    │
 *   │  writeBrainSummary()→ commit a markdown note to brain   │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Failure semantics: each hook catches and logs internally. None throw to
 * the loop — observability is a side-effect, not a hard dependency. The
 * agent must keep working if Supabase blips.
 */

import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { loadBrainDocuments, commitBrainChanges } from '<npm>/lib/brain/store'
import { resolvePolicyForTool, type ToolPolicyMap } from './tool-policies'
import { scoreActionConfidence } from './confidence'

// ─── Tier 1: run history ───────────────────────────────────────────────────

export async function startRun({
  userId,
  agentSlug,
}: {
  userId: string
  agentSlug: string
}): Promise<string | null> {
  try {
    const supabase = getServerSupabaseClient()
    const { data, error } = await supabase
      .from('agent_runs')
      .insert({
        user_id: userId,
        agent_slug: agentSlug,
        status: 'running',
      })
      .select('id')
      .single()
    if (error || !data) {
      console.warn('[hooks.startRun] insert failed:', error?.message)
      return null
    }
    return data.id as string
  } catch (err) {
    console.warn('[hooks.startRun] threw:', err)
    return null
  }
}

export async function finishRun({
  runId,
  status,
  summary,
  actionsTaken,
  tokensUsed,
  errorMessage,
  notionWrites,
}: {
  runId: string | null
  status: 'success' | 'failed' | 'skipped'
  summary?: string
  actionsTaken?: number
  tokensUsed?: number
  errorMessage?: string
  notionWrites?: number
}): Promise<void> {
  if (!runId) return
  try {
    const supabase = getServerSupabaseClient()
    const { error } = await supabase
      .from('agent_runs')
      .update({
        status,
        ended_at: new Date().toISOString(),
        summary: summary ?? null,
        actions_taken: actionsTaken ?? 0,
        tokens_used: tokensUsed ?? null,
        notion_writes: notionWrites ?? 0,
        error_message: errorMessage ?? null,
      })
      .eq('id', runId)
    if (error) console.warn('[hooks.finishRun] update failed:', error.message)
  } catch (err) {
    console.warn('[hooks.finishRun] threw:', err)
  }
}

// ─── Tier 2: brain reads (prepareStep context) ────────────────────────────

/**
 * Load high-signal brain documents for the agent's prepareStep injection.
 * Returns a system-prompt-ready markdown block, or '' if nothing relevant.
 *
 * Default prefixes are the curated "always relevant" buckets:
 *   - risk-register/    → currently-tracked risks
 *   - pattern-cards/    → repeated patterns the agent has noticed
 *   - decision-log/     → recent customer decisions
 *
 * For employee-specific context, pass scopedPrefixes (e.g. ['employees/sarah/']).
 */
export async function loadBrainContext({
  userId,
  scopedPrefixes,
  limit = 12,
}: {
  userId: string
  scopedPrefixes?: ReadonlyArray<string>
  limit?: number
}): Promise<string> {
  try {
    const prefixes = scopedPrefixes && scopedPrefixes.length > 0
      ? [...scopedPrefixes]
      : ['risk-register/', 'pattern-cards/', 'decision-log/']

    const docs = await loadBrainDocuments({ userId, prefixes, limit })
    if (docs.length === 0) return ''

    const sections = docs.map(
      (d) => `### ${d.path}\n${d.content.trim()}`,
    )
    return [
      '## Relevant context from your brain',
      '',
      'These are the active risks, patterns, and recent decisions you should',
      'consider before acting. They were written by you or your teammates in',
      'previous runs.',
      '',
      ...sections,
    ].join('\n')
  } catch (err) {
    console.warn('[hooks.loadBrainContext] failed:', err)
    return ''
  }
}

// ─── Tier 2: approval gate + action queue ──────────────────────────────────

/**
 * Destructive Gmail tool names — these write/send/delete. They need approval
 * unless the customer's autonomy is 'auto'. Read-only tools (list, get, search)
 * are always 'auto'.
 *
 * Engine-level: as new toolkits are added, append their destructive tool
 * names here. Goal is one flat list, not one switch per toolkit.
 */
const DESTRUCTIVE_TOOLS: ReadonlySet<string> = new Set([
  // Gmail writes / sends / deletes
  'gmail_send',
  'gmail_reply',
  'gmail_create_draft',
  'gmail_send_draft',
  'gmail_update_draft',
  'gmail_modify_message',
  'gmail_trash_message',
  'gmail_create_label',
  'gmail_untrash_message',
  'gmail_modify_thread',
  'gmail_trash_thread',
  'gmail_update_vacation_settings',
])

export type ToolGateDecision =
  | { kind: 'auto' }                                    // execute immediately
  | { kind: 'approval'; reason: string }                // enqueue, don't execute
  | { kind: 'blocked'; reason: string }                 // refuse outright

export type ToolGateInput = {
  userId: string
  agentSlug: string
  toolName: string
  args: Record<string, unknown>
  /**
   * Per-toolkit Ask/Auto/Off policy map loaded once at run start. Resolved
   * via resolvePolicyForTool() — toolkit slug derived from toolName prefix.
   */
  policies: ToolPolicyMap
  /**
   * Global fallback when no per-toolkit row exists. Default 'ask'.
   */
  globalDefault?: 'ask' | 'auto' | 'off'
}

export function classifyToolCall(input: ToolGateInput): ToolGateDecision {
  const { toolName, policies, globalDefault = 'ask' } = input
  const policy = resolvePolicyForTool({ toolName, policies, globalDefault })

  if (policy === 'off' && DESTRUCTIVE_TOOLS.has(toolName)) {
    return { kind: 'blocked', reason: 'Tool autonomy is OFF for this toolkit — destructive call blocked.' }
  }
  if (!DESTRUCTIVE_TOOLS.has(toolName)) {
    return { kind: 'auto' }  // read-only — always allowed
  }
  if (policy === 'auto') {
    return { kind: 'auto' }
  }
  return {
    kind: 'approval',
    reason: `${toolName} writes to the customer's tool. Queued for approval (toolkit policy: ${policy}).`,
  }
}

/**
 * Insert a pending row in agent_actions so the customer can approve/reject
 * in /dashboard/actions. The 'composio_action' action_type is reused — name
 * is historical, payload shape (toolkit + action + arguments) is generic.
 */
export async function enqueueAction({
  userId,
  agentSlug,
  toolName,
  args,
  summary,
}: {
  userId: string
  agentSlug: string
  toolName: string
  args: Record<string, unknown>
  summary?: string
}): Promise<{ actionId: string; confidence: number; band: 'low' | 'medium' | 'high' } | null> {
  try {
    const supabase = getServerSupabaseClient()
    const [toolkit] = toolName.split('_')
    const confidence = scoreActionConfidence({ toolName, args, summary })

    const { data, error } = await supabase
      .from('agent_actions')
      .insert({
        user_id: userId,
        action_type: 'composio_action',
        status: 'pending',
        payload: {
          toolkit: toolkit ?? 'unknown',
          action_slug: toolName,
          arguments: args,
          source: 'cron-agent',
          agent_slug: agentSlug,
          summary: summary ?? `${agentSlug} wants to call ${toolName}`,
          confidence_score: confidence.score,
          confidence_band: confidence.band,
          confidence_factors: confidence.factors,
        } as unknown as import('<npm>/lib/database.types').Json,
      })
      .select('id')
      .single()
    if (error || !data) {
      console.warn('[hooks.enqueueAction] insert failed:', error?.message)
      return null
    }
    return {
      actionId: data.id as string,
      confidence: confidence.score,
      band: confidence.band,
    }
  } catch (err) {
    console.warn('[hooks.enqueueAction] threw:', err)
    return null
  }
}

// ─── Tier 3: brain writes (persistent memory) ──────────────────────────────

/**
 * After a run completes, commit a short markdown note to the brain so the
 * next run (or another employee) can see what happened.
 *
 * Path convention: `employees/<slug>/runs/<YYYY-MM-DD>.md` — daily roll-up.
 * If two runs happen the same day, the file gets versioned; the latest
 * pointer rotates and the older version is preserved (git-like).
 */
export async function writeBrainSummary({
  userId,
  agentSlug,
  runId,
  summary,
  actionsTaken,
}: {
  userId: string
  agentSlug: string
  runId: string | null
  summary: string
  actionsTaken: number
}): Promise<void> {
  if (!summary.trim()) return
  try {
    const today = new Date().toISOString().slice(0, 10)  // YYYY-MM-DD
    const path = `employees/${agentSlug}/runs/${today}.md`

    const content = [
      `# ${agentSlug} — ${today}`,
      '',
      `- Tool calls: **${actionsTaken}**`,
      runId ? `- Run id: \`${runId}\`` : '',
      '',
      '## Summary',
      '',
      summary.trim(),
    ]
      .filter(Boolean)
      .join('\n')

    await commitBrainChanges({
      userId,
      message: `${agentSlug} run summary (${today})`,
      authorType: `agent:${agentSlug}`,
      agentRunId: runId ?? undefined,
      changes: [{ path, content }],
    })
  } catch (err) {
    console.warn('[hooks.writeBrainSummary] failed:', err)
  }
}
