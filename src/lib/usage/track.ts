/**
 * Usage tracking + quota enforcement (CP-23).
 *
 * Three public functions:
 *
 *   recordUsage(input)
 *     Inserts a row into external_api_usage. Fire-and-forget — failures
 *     are logged but never thrown (we don't want a usage-log bug to take
 *     down a customer's COO chat).
 *
 *   checkQuota({ userId, provider })
 *     Returns { allowed, used, cap, remaining, resetsAt } for the calendar
 *     month containing now(). Reads sum(credits|tokens) from the usage table.
 *
 *   withQuota({ userId, provider, operation }, fn)
 *     Convenience wrapper. Checks quota first; if blocked returns a
 *     standardized error response. Otherwise runs fn(), records actual
 *     usage from fn's return value, and returns fn's result.
 *
 * The usage table is service-role-write-only (see migration). All three
 * functions assume they're running server-side.
 */

import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { getUserTier } from '<npm>/lib/agents/tier-gate'
import type { Json } from '<npm>/lib/database.types'
import {
  TIER_CAPS,
  type Operation,
  type Provider,
  type QuotaCheck,
  type UsageRecordInput,
} from './types'

/** First-of-the-month UTC. */
function monthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
}

/** First-of-next-month UTC — when the quota resets. */
function monthResetAt(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0))
}

/**
 * Provider-specific count column. OpenAI/Anthropic count tokens.
 */
function countColumnFor(provider: Provider): 'credits_used' | 'tokens_used' {
  return provider === 'openai' || provider === 'anthropic' ? 'tokens_used' : 'credits_used'
}

export async function recordUsage(input: UsageRecordInput): Promise<void> {
  const { userId, provider, operation, credits, tokens, costCents, metadata } = input
  try {
    const supabase = getServerSupabaseClient()
    await supabase.from('external_api_usage').insert({
      user_id: userId,
      provider,
      operation,
      credits_used: credits ?? 0,
      tokens_used: tokens ?? null,
      cost_estimate_cents: costCents ?? null,
      metadata: (metadata ?? {}) as unknown as Json,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Logging only — never throw. A usage-log failure must not break customer
    // flow.
    console.warn('[usage/track] recordUsage failed:', message)
  }
}

export async function checkQuota(input: {
  userId: string
  provider: Provider
}): Promise<QuotaCheck> {
  const { userId, provider } = input
  const tier = (await getUserTier(userId)) ?? 'starter'
  const cap = TIER_CAPS[tier][provider]
  const since = monthStart()
  const resetsAt = monthResetAt()
  const column = countColumnFor(provider)

  try {
    const supabase = getServerSupabaseClient()
    const { data, error } = await supabase
      .from('external_api_usage')
      .select(column)
      .eq('user_id', userId)
      .eq('provider', provider)
      .gte('occurred_at', since.toISOString())

    if (error) {
      console.warn('[usage/track] checkQuota failed:', error.message)
      // Fail-open — better to allow a call we should have blocked than to
      // disable a customer because of a logging bug.
      return { allowed: true, used: 0, cap, remaining: cap, resetsAt }
    }

    const used = (data ?? []).reduce((sum: number, row) => {
      const v = (row as Record<string, unknown>)[column]
      return sum + (typeof v === 'number' ? v : 0)
    }, 0)
    const remaining = Math.max(0, cap - used)
    return { allowed: used < cap, used, cap, remaining, resetsAt }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[usage/track] checkQuota threw:', message)
    return { allowed: true, used: 0, cap, remaining: cap, resetsAt }
  }
}

/**
 * Wrap a single provider call with quota check + usage recording.
 *
 * `fn` must return `{ result, usage }` where `usage` reports actual
 * credit/token consumption for the call we just made. If `fn` throws,
 * no usage is recorded (we assume the provider didn't charge us).
 */
export async function withQuota<T>(
  input: {
    userId: string
    provider: Provider
    operation: Operation
    /** Pre-call estimate. Useful for queries with knowable cost (e.g. Tavily). */
    estimatedCredits?: number
  },
  fn: () => Promise<{
    result: T
    usage: {
      credits?: number
      tokens?: number
      costCents?: number
      metadata?: Record<string, unknown>
    }
  }>,
): Promise<
  | { ok: true; result: T; usage: QuotaCheck }
  | { ok: false; error: string; usage: QuotaCheck }
> {
  const quota = await checkQuota({ userId: input.userId, provider: input.provider })
  if (!quota.allowed) {
    return {
      ok: false,
      error: `Monthly ${input.provider} quota reached (${quota.used}/${quota.cap}). Resets ${quota.resetsAt.toISOString().slice(0, 10)}.`,
      usage: quota,
    }
  }

  const { result, usage } = await fn()

  await recordUsage({
    userId: input.userId,
    provider: input.provider,
    operation: input.operation,
    credits: usage.credits,
    tokens: usage.tokens,
    costCents: usage.costCents,
    metadata: usage.metadata,
  })

  // Quota figures returned to the caller are pre-call (don't re-fetch).
  return { ok: true, result, usage: quota }
}
