/**
 * Per-agent brain-path hints (CP-30).
 *
 * Each domain / tool / evaluator agent has specific brain paths it
 * typically writes to. These hints get appended to the agent's
 * system prompt so the agent picks the right path without inventing
 * one. Reduces "creative path naming" → easier-to-mirror Notion sync,
 * easier-to-query brain.
 *
 * NOT a replacement for the BRAIN_DIRECTORIES list — augments it.
 */

import type { AgentSlug } from '<npm>/lib/agents/types'
import { BRAIN_DIRECTORIES } from './paths'

type Hint = {
  path: string
  purpose: string
}

const DOMAIN_AGENT_HINTS: Record<string, Hint[]> = {
  revenue: [
    { path: 'kpi-snapshots/<YYYY-Www>.md', purpose: 'weekly MRR / cash / AR / margin snapshot (Mondays only)' },
    { path: 'real-pl/<YYYY-MM>-<client-slug>.md', purpose: 'per-client monthly P&L row' },
    { path: 'pattern-cards/<slug>.md', purpose: 'new revenue pattern noticed' },
    { path: 'risk-register/<slug>.md', purpose: 'cash-runway or churn risk flagged' },
    { path: 'agent-runs/<YYYY-MM-DD>-revenue.md', purpose: 'daily run summary' },
  ],
  collections: [
    { path: 'risk-register/<client-slug>-overdue.md', purpose: 'chronic-late-payment risk flagged' },
    { path: 'pattern-cards/<slug>.md', purpose: 'collections pattern noticed' },
    { path: 'agent-runs/<YYYY-MM-DD>-collections.md', purpose: 'reminders queued + AR aging summary' },
  ],
  scope: [
    { path: 'risk-register/<client-slug>-scope-creep.md', purpose: 'scope creep flagged' },
    { path: 'pattern-cards/<slug>.md', purpose: 'scope-creep pattern noticed' },
    { path: 'clients/<client-slug>.md', purpose: 'update client difficulty score / scope incidents' },
    { path: 'agent-runs/<YYYY-MM-DD>-scope.md', purpose: 'weekly scope-creep summary' },
  ],
  delivery: [
    { path: 'projects/<project-slug>.md', purpose: 'project status update' },
    { path: 'risk-register/<project-slug>-slip.md', purpose: 'delivery slip risk flagged' },
    { path: 'pattern-cards/<slug>.md', purpose: 'delivery pattern noticed' },
    { path: 'agent-runs/<YYYY-MM-DD>-delivery.md', purpose: 'weekly delivery summary' },
  ],
  briefing: [
    { path: 'pages/brain-home.md', purpose: 'refresh the Brain Home with this week\'s state' },
    { path: 'agent-runs/<YYYY-MM-DD>-briefing.md', purpose: 'full Monday Brief text (audit log)' },
    { path: 'quarterly-memory/<YYYY-Qn>.md', purpose: 'end-of-quarter narrative page (last Monday of the quarter only)' },
  ],
  profitability: [
    { path: 'clients/<client-slug>.md', purpose: 'update client margin status' },
    { path: 'real-pl/<YYYY-MM>-<client-slug>.md', purpose: 'monthly P&L row per client' },
    { path: 'risk-register/<client-slug>-margin.md', purpose: 'low-margin or negative-margin client flagged' },
    { path: 'pattern-cards/<slug>.md', purpose: 'service-line / pricing pattern noticed' },
    { path: 'agent-runs/<YYYY-MM-DD>-profitability.md', purpose: 'weekly profitability summary' },
  ],
  team: [
    { path: 'team/<member-slug>.md', purpose: 'team member capacity / burnout snapshot' },
    { path: 'risk-register/team-burnout-<member-slug>.md', purpose: 'burnout risk flagged (owner-only)' },
    { path: 'pattern-cards/<slug>.md', purpose: 'team / culture pattern noticed' },
    { path: 'agent-runs/<YYYY-MM-DD>-team.md', purpose: 'nightly team summary' },
  ],
  growth: [
    { path: 'pattern-cards/<channel-slug>.md', purpose: 'channel ROI pattern' },
    { path: 'risk-register/pipeline-<slug>.md', purpose: 'pipeline coverage / stuck-deal risk' },
    { path: 'agent-runs/<YYYY-MM-DD>-growth.md', purpose: 'weekly growth summary' },
  ],
  renewal: [
    { path: 'contracts/<client-slug>.md', purpose: 'contract status update with risk score + signals fired' },
    { path: 'risk-register/<client-slug>-renewal.md', purpose: 'HIGH-risk renewal flagged' },
    { path: 'agent-runs/<YYYY-MM-DD>-renewal.md', purpose: 'daily renewal summary' },
  ],
  stack: [
    { path: 'tool-stack/<tool-slug>.md', purpose: 'per-tool waste / utilization analysis' },
    { path: 'risk-register/stack-waste.md', purpose: 'total annual waste flagged' },
    { path: 'agent-runs/<YYYY-MM-DD>-stack.md', purpose: 'monthly stack audit summary' },
  ],
  evaluator: [
    { path: 'agent-runs/<YYYY-MM-DD>-evaluator.md', purpose: 'daily quality report on every other agent\'s output' },
    { path: 'pattern-cards/quality-<slug>.md', purpose: 'systematic quality issue across agents' },
  ],
}

/**
 * Tool agents share a single pattern — they pull data from one toolkit
 * and write findings as a daily run note. They occasionally surface
 * patterns or risks that the domain agents pick up.
 */
const TOOL_AGENT_HINTS: Hint[] = [
  { path: 'agent-runs/<YYYY-MM-DD>-tool-<toolkit>.md', purpose: 'today\'s findings summary from this tool' },
  { path: 'pattern-cards/<slug>.md', purpose: 'tool-specific pattern noticed' },
  { path: 'risk-register/<slug>.md', purpose: 'tool-flagged risk surfaced for cross-agent visibility' },
]

export function getBrainPathHints(agentSlug: AgentSlug | string): Hint[] {
  // Tool agents — slug shape is 'tool-<toolkit>' (e.g. 'tool-hubspot').
  if (typeof agentSlug === 'string' && agentSlug.startsWith('tool-')) {
    return TOOL_AGENT_HINTS
  }
  return DOMAIN_AGENT_HINTS[agentSlug as string] ?? []
}

/** System-prompt-ready block summarizing this agent's recommended brain paths. */
export function buildAgentBrainHintsBlock(agentSlug: AgentSlug | string): string {
  const hints = getBrainPathHints(agentSlug)
  if (hints.length === 0) return ''
  const lines = [
    `# Your brain path conventions (${agentSlug})`,
    '',
    'Write to THESE paths specifically for this agent — keeps the customer\'s brain organized and the Notion mirror consistent:',
    '',
    ...hints.map((h) => `  - ${h.path}  — ${h.purpose}`),
    '',
    `All allowed top-level directories (use only these): ${BRAIN_DIRECTORIES.join(', ')}`,
  ]
  return lines.join('\n')
}
