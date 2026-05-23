/**
 * Shared agent runner. Every agent flows through this single loop.
 *
 * Flow:
 *   1. Tier gate (skip with reason='tier' if not allowed)
 *   2. Integration gate (skip with reason='missing-integration:X' if any required tool not connected)
 *   3. Insert a 'running' row in agent_runs
 *   4. Load Composio tools for this user across the agent's required toolkits
 *   5. Multi-step `generateText` loop with stepCountIs(spec.maxSteps)
 *   6. Update agent_runs row with status, summary, counters
 *
 * Proven pattern: scripts/smoke-revenue-agent.ts demonstrated this end-to-end.
 */

import { generateText, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import {
  COMPOSIO_TOOLS,
  getComposioToolsForUser,
  type ToolSlug,
} from '<npm>/lib/composio'
import { readHowWeWork } from '<npm>/lib/notion/read-how-we-work'
import { readDecisionLog } from '<npm>/lib/notion/read-decision-log'
import { getApprovalPatterns } from '<npm>/lib/actions/approval-patterns'
import type { AgentRunResult, AgentSpec, AgentSlug } from './types'
import { getUserTier, tierAllows } from './tier-gate'

const VALID_SLUGS = new Set(Object.keys(COMPOSIO_TOOLS) as ToolSlug[])
const isToolSlug = (v: string): v is ToolSlug => VALID_SLUGS.has(v as ToolSlug)

export async function runAgent(spec: AgentSpec, userId: string): Promise<AgentRunResult> {
  // 1. Tier gate
  const tier = await getUserTier(userId)
  if (!tier || !tierAllows(tier, spec.slug)) {
    return logSkip(userId, spec.slug, 'tier')
  }

  // 2. Integrations gate
  const connected = await getConnectedTools(userId)
  const missing = spec.requiredIntegrations.filter((t) => !connected.has(t))
  if (missing.length > 0) {
    return logSkip(userId, spec.slug, `missing-integration:${missing.join(',')}`)
  }

  // 3. Start run
  const runId = await startAgentRun(userId, spec.slug)
  if (!runId) {
    return { status: 'failed', errorMessage: 'Could not insert agent_runs row' }
  }

  try {
    // 4. Load Composio tools. Filter to ones the user has actually connected to
    // avoid noisy "this tool isn't connected" errors from optional toolkits.
    const wantedToolkits = spec.composioApps.filter((t): t is ToolSlug =>
      isToolSlug(t) && connected.has(t as ToolSlug),
    )
    const tools = wantedToolkits.length > 0
      ? await getComposioToolsForUser(userId, wantedToolkits.map((t) => COMPOSIO_TOOLS[t]))
      : ({} as Awaited<ReturnType<typeof getComposioToolsForUser>>)

    // 5. Personalize the system prompt with three best-effort enrichments —
    // any of these returning null leaves the agent on its base behaviour:
    //   (a) "How We Work" — customer-authored rules from Notion
    //   (b) "Decision Log" — recent strategic decisions, so we don't
    //       re-suggest things they've already decided against
    //   (c) Approval patterns — aggregated approve / reject / edit feedback
    //       for this specific agent, so the model adjusts its style
    const [howWeWork, decisions, patterns] = await Promise.all([
      readHowWeWork(userId),
      readDecisionLog(userId),
      getApprovalPatterns(userId, spec.slug, 60),
    ])

    const enrichments: string[] = []
    if (howWeWork) {
      enrichments.push(
        `# How this customer works (defer to these rules — they teach you their style)\n${howWeWork}`,
      )
    }
    if (decisions) {
      enrichments.push(
        `# Recent strategic decisions (don't re-suggest things already decided)\n${decisions}`,
      )
    }
    if (patterns) {
      enrichments.push(
        `# Your approval patterns with this customer (adjust your style accordingly)\n${patterns}`,
      )
    }

    const systemPrompt =
      enrichments.length > 0
        ? `${spec.systemPrompt}\n\n${enrichments.join('\n\n')}`
        : spec.systemPrompt

    // 6. Run the multi-step loop
    const result = await generateText({
      model: openai(spec.model),
      system: systemPrompt,
      prompt: `Run your analysis. Today is ${new Date().toISOString().slice(0, 10)}.`,
      tools,
      stopWhen: stepCountIs(spec.maxSteps),
    })

    // 7. Mark connections used so we can show "last used" in the integrations UI
    if (wantedToolkits.length > 0) {
      await markConnectionsUsed(userId, wantedToolkits)
    }

    return completeAgentRun(runId, {
      status: 'success',
      summary: result.text,
      tokensUsed: (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0),
    })
  } catch (err) {
    return failAgentRun(runId, err)
  }
}

// ---------- Helpers ----------

async function getConnectedTools(userId: string): Promise<Set<ToolSlug>> {
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('composio_connections')
    .select('tool_slug')
    .eq('user_id', userId)
    .eq('is_active', true)
  if (error) {
    console.error('[agent-loop] getConnectedTools failed:', error)
    return new Set()
  }
  const out = new Set<ToolSlug>()
  for (const row of data ?? []) {
    if (isToolSlug(row.tool_slug)) out.add(row.tool_slug)
  }
  return out
}

async function markConnectionsUsed(userId: string, toolkits: ToolSlug[]): Promise<void> {
  const supabase = getServerSupabaseClient()
  await supabase
    .from('composio_connections')
    .update({ last_used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('tool_slug', toolkits)
}

async function startAgentRun(userId: string, slug: AgentSlug): Promise<string | null> {
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('agent_runs')
    .insert({ user_id: userId, agent_slug: slug, status: 'running' })
    .select('id')
    .single()
  if (error) {
    console.error('[agent-loop] startAgentRun failed:', error)
    return null
  }
  return data.id
}

async function completeAgentRun(
  runId: string,
  partial: Pick<AgentRunResult, 'status' | 'summary' | 'tokensUsed'> &
    Partial<AgentRunResult>,
): Promise<AgentRunResult> {
  const supabase = getServerSupabaseClient()
  await supabase
    .from('agent_runs')
    .update({
      ended_at: new Date().toISOString(),
      status: partial.status,
      summary: partial.summary,
      tokens_used: partial.tokensUsed,
      actions_taken: partial.actionsTaken ?? 0,
      patterns_detected: partial.patternsDetected ?? 0,
      risks_flagged: partial.risksFlagged ?? 0,
      notion_writes: partial.notionWrites ?? 0,
    })
    .eq('id', runId)
  return partial as AgentRunResult
}

async function failAgentRun(runId: string, err: unknown): Promise<AgentRunResult> {
  const message = err instanceof Error ? err.message : String(err)
  console.error('[agent-loop] run failed:', message)
  const supabase = getServerSupabaseClient()
  await supabase
    .from('agent_runs')
    .update({
      ended_at: new Date().toISOString(),
      status: 'failed',
      error_message: message,
    })
    .eq('id', runId)
  return { status: 'failed', errorMessage: message }
}

async function logSkip(
  userId: string,
  slug: AgentSlug,
  reason: string,
): Promise<AgentRunResult> {
  const supabase = getServerSupabaseClient()
  await supabase.from('agent_runs').insert({
    user_id: userId,
    agent_slug: slug,
    status: 'skipped',
    summary: reason,
    ended_at: new Date().toISOString(),
  })
  return { status: 'skipped', reason }
}
