/**
 * Multi-tenant external-API usage tracking + per-customer quota (CP-23).
 *
 * Every call to a shared third-party API runs through `withQuota()` (or
 * `recordUsage()` if the caller has already done its own quota check).
 * The wrapper logs to `external_api_usage` and enforces per-tier monthly caps.
 */

import type { Plan } from '<npm>/lib/tier'

export type Provider = 'openai' | 'anthropic'

/** Operation names — keep this loose, free-form. Used as the `operation` tag. */
export type Operation =
  // OpenAI / Anthropic
  | 'agent_chat'
  | 'coo_chat'
  | 'briefing_generate'
  | 'evaluator_run'
  | 'agent_cron_run'
  | 'document_analysis'
  | 'competitor_research_extract'
  | 'automation_compile'
  // Integration-brokered tool calls
  | 'tool_execute'
  | 'tool_fetch'
  | 'trigger_register'
  // Tavily
  | 'web_search'
  | 'web_search_advanced'
  | 'research_competitor'
  // Catch-all
  | (string & {})

/**
 * Per-tier monthly caps per provider. Numbers are deliberately generous —
 * the goal is to catch abuse, not gate normal usage. A future paid customer
 * complaint of "I hit the cap" is signal to either raise the cap or talk
 * about an enterprise tier.
 *
 * OpenAI: count = total tokens (input + output)
 * Anthropic: same as OpenAI
 */
export type TierCaps = Record<Provider, number>

export const TIER_CAPS: Record<Plan, TierCaps> = {
  starter: {
    openai: 5_000_000,       // ~5M tokens/month — covers daily briefings + light chat
    anthropic: 5_000_000,
  },
  growth: {
    openai: 25_000_000,
    anthropic: 25_000_000,
  },
  pro: {
    openai: 100_000_000,
    anthropic: 100_000_000,
  },
  fo: {
    // Fractional Operator tier — multi-client; needs higher caps
    openai: 200_000_000,
    anthropic: 200_000_000,
  },
}

export type QuotaCheck = {
  allowed: boolean
  used: number
  cap: number
  remaining: number
  resetsAt: Date
}

export type UsageRecordInput = {
  userId: string
  provider: Provider
  operation: Operation
  credits?: number
  tokens?: number
  costCents?: number
  metadata?: Record<string, unknown>
}
