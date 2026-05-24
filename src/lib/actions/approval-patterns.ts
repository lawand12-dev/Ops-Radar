/**
 * Approval pattern signals (the personalization moat completion).
 *
 * Every time a customer approves / rejects / edits an agent's queued action,
 * we record it on `agent_actions` (rejected_at, edited_at, feedback_reason,
 * edit_diff). Over time this becomes the highest-signal corpus we own about
 * what THIS customer wants from THIS agent.
 *
 * This helper aggregates the last N days of feedback for one (user, agent)
 * pair and produces a plain-text summary the agent loop injects into the
 * system prompt. The agent then adjusts its style on the next run.
 *
 * Returns `null` when there is too little signal to learn from (< 5 actions)
 * — the agent loop falls through to its base behaviour in that case.
 */

import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import type { AgentSlug } from '<npm>/lib/agents/types'

const MIN_ACTIONS_FOR_SIGNAL = 5
const MAX_REASONS_SAMPLED = 5

const AGENT_DISPLAY_NAME: Record<AgentSlug, string> = {
  revenue: 'Revenue Agent',
  collections: 'Collections Agent',
  scope: 'Scope Agent',
  delivery: 'Delivery Agent',
  briefing: 'Briefing Agent',
  profitability: 'Profitability Agent',
  team: 'Team Agent',
  growth: 'Growth Agent',
  renewal: 'Renewal Agent',
  stack: 'Stack Agent',
  'tool-gmail': 'Gmail Agent',
  'tool-hubspot': 'HubSpot Agent',
  'tool-pipedrive': 'Pipedrive Agent',
  'tool-apollo': 'Apollo Agent',
  'tool-calendly': 'Calendly Agent',
  'tool-clickup': 'ClickUp Agent',
  'tool-asana': 'Asana Agent',
  'tool-monday': 'Monday Agent',
  'tool-harvest': 'Harvest Agent',
  'tool-toggl': 'Toggl Agent',
  'tool-notion': 'Notion Agent',
  'tool-slack': 'Slack Agent',
  'tool-stripe': 'Stripe Agent',
  'tool-quickbooks': 'QuickBooks Agent',
  'tool-google-calendar': 'Google Calendar Agent',
  'tool-google-analytics': 'Google Analytics Agent',
  'tool-google-ads': 'Google Ads Agent',
  'tool-linkedin': 'LinkedIn Agent',
  'tool-bamboo-hr': 'BambooHR Agent',
  'tool-gusto': 'Gusto Agent',
  'tool-typeform': 'Typeform Agent',
  'tool-intercom': 'Intercom Agent',
  'tool-zendesk': 'Zendesk Agent',
  evaluator: 'Evaluator Agent',
}

/**
 * Returns a plain-text summary of the customer's approval patterns for an
 * agent, suitable for injection into the agent's system prompt.
 *
 * Returns `null` when:
 *  - The user has not yet generated enough actions for this agent (< 5)
 *  - The query fails for any reason (best-effort — never throws)
 */
export async function getApprovalPatterns(
  userId: string,
  agentSlug: AgentSlug,
  sinceDays: number = 60,
): Promise<string | null> {
  try {
    const supabase = getServerSupabaseClient()
    const sinceIso = new Date(
      Date.now() - sinceDays * 86400 * 1000,
    ).toISOString()

    const { data, error } = await supabase
      .from('agent_actions')
      .select('approved_at, rejected_at, edited_at, feedback_reason, edit_diff, created_at')
      .eq('user_id', userId)
      .eq('agent_slug', agentSlug)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[approval-patterns] query failed:', error.message)
      return null
    }

    const rows = data ?? []
    const total = rows.length
    if (total < MIN_ACTIONS_FOR_SIGNAL) return null

    let approved = 0
    let rejected = 0
    let edited = 0
    const reasons: string[] = []
    const editSamples: string[] = []

    for (const row of rows) {
      if (row.approved_at) approved += 1
      if (row.rejected_at) rejected += 1
      if (row.edited_at) edited += 1
      if (row.feedback_reason && reasons.length < MAX_REASONS_SAMPLED) {
        reasons.push(row.feedback_reason)
      }
      if (row.edit_diff && editSamples.length < MAX_REASONS_SAMPLED) {
        editSamples.push(row.edit_diff)
      }
    }

    const queued = total
    const approvalRate = queued > 0 ? Math.round((approved / queued) * 100) : 0
    const agentName = AGENT_DISPLAY_NAME[agentSlug] ?? agentSlug

    const lines: string[] = []
    lines.push(
      `Approval history for the last ${sinceDays} days (${agentName}):`,
    )
    lines.push(
      `- ${queued} actions queued, ${approved} approved, ${rejected} rejected, ${edited} edited`,
    )

    if (approvalRate >= 80) {
      lines.push(`- Approval rate: ${approvalRate}% — keep current style`)
    } else if (approvalRate >= 50) {
      lines.push(
        `- Approval rate: ${approvalRate}% — your style is mixed; lean toward the rejected-reason patterns below`,
      )
    } else {
      lines.push(
        `- Approval rate: ${approvalRate}% — your suggestions miss often; study the rejection reasons carefully before generating more`,
      )
    }

    if (reasons.length > 0) {
      lines.push(
        `- Rejections cited: ${reasons
          .map((r) => `"${truncate(r, 140)}"`)
          .join('; ')}`,
      )
    }

    if (editSamples.length > 0) {
      lines.push(
        `- Customer edit patterns observed: ${editSamples
          .map((d) => `"${truncate(d, 140)}"`)
          .join('; ')}`,
      )
    }

    return lines.join('\n')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[approval-patterns] failed:', message)
    return null
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}
