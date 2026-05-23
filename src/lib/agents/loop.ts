/**
 * Shared agent runner. Every agent flows through this single loop.
 *
 * Flow:
 *   1. Tier gate (skip with reason='tier' if not allowed)
 *   2. Integration gate (skip with reason='missing-integration:X' if any required tool not connected)
 *   3. Insert a 'running' row in agent_runs
 *   4. Load Composio tools + Notion write tools
 *   5. Multi-step tool-calling loop (≤ spec.maxSteps)
 *   6. Update agent_runs row with status, summary, counters
 *
 * Design spec: docs/dev/specs/2026-05-23-agents-notion-composio-design.md §4.1
 */

import type { AgentRunResult, AgentSpec } from './types'
import { getUserTier, tierAllows } from './tier-gate'

export async function runAgent(spec: AgentSpec, userId: string): Promise<AgentRunResult> {
  // 1. Tier gate
  const tier = await getUserTier(userId)
  if (!tier || !tierAllows(tier, spec.slug)) {
    return logSkip(userId, spec.slug, 'tier')
  }

  // 2. Integrations gate
  const connected = await getConnectedTools(userId)
  const missing = spec.requiredIntegrations.filter((t) => !connected.includes(t))
  if (missing.length > 0) {
    return logSkip(userId, spec.slug, `missing-integration:${missing.join(',')}`)
  }

  // 3. Start run
  const runId = await startAgentRun(userId, spec.slug)

  try {
    // 4. Load tools
    // const tools = await getComposioToolsForUser(userId, spec.composioApps.map(slug => COMPOSIO_TOOLS[slug]))
    // const notionTools = await buildNotionWriteTools(userId)

    // 5. Tool loop
    // let messages: ChatMessage[] = [
    //   { role: 'system', content: spec.systemPrompt },
    //   { role: 'user', content: `Run your analysis. Today: ${new Date().toISOString()}` },
    // ]
    // let steps = 0
    // while (steps < spec.maxSteps) { ... break when no tool_calls returned ... }

    // 6. Complete
    return completeAgentRun(runId, {
      status: 'success',
      summary: 'scaffold — not wired yet',
    })
  } catch (err) {
    return failAgentRun(runId, err)
  }
}

// ---------- Helpers (all scaffolds) ----------

async function getConnectedTools(_userId: string): Promise<string[]> {
  // TODO(scaffold): SELECT tool_slug FROM composio_connections WHERE user_id = ? AND is_active = true
  return []
}

async function startAgentRun(_userId: string, _slug: string): Promise<string> {
  // TODO(scaffold): INSERT INTO agent_runs (user_id, agent_slug, status='running') RETURNING id
  return 'scaffold-run-id'
}

async function completeAgentRun(
  _runId: string,
  partial: Partial<AgentRunResult> & { status: AgentRunResult['status'] },
): Promise<AgentRunResult> {
  // TODO(scaffold): UPDATE agent_runs SET ended_at=now(), status=?, summary=?, ... WHERE id=?
  return { ...partial }
}

async function failAgentRun(_runId: string, err: unknown): Promise<AgentRunResult> {
  const message = err instanceof Error ? err.message : String(err)
  // TODO(scaffold): UPDATE agent_runs SET status='failed', error_message=?, ended_at=now() WHERE id=?
  return { status: 'failed', errorMessage: message }
}

async function logSkip(
  _userId: string,
  _slug: string,
  reason: string,
): Promise<AgentRunResult> {
  // TODO(scaffold): INSERT a skipped agent_run row for visibility on the agents page.
  return { status: 'skipped', reason }
}
