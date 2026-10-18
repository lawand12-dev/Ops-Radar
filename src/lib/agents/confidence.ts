/**
 * Confidence scoring for queued actions (CP-18 heuristic).
 *
 * Every action enqueued through the approval gate gets a 0–100 score that
 * appears on the action card. Customers learn over time which agents/tools
 * to trust by watching how score correlates with outcomes (approve/reject).
 *
 * Heuristic (NOT ML) — boring is correct here. Score is the sum of:
 *
 *   Base                              | +60  (every action starts here)
 *   Read-only / non-destructive       | +30  (low risk to send unreviewed)
 *   Destructive (send/delete/modify)  | -10  (higher risk, lower confidence)
 *   Has summary text                  | +5   (model thought about it)
 *   Has recipient (gmail to:)         | +5   (action is concretely targeted)
 *   Replying in a thread              | +10  (continues established context)
 *   Targets known-good client domain  | +10  (TODO once we have domain trust)
 *   Brand-new client domain           | -15  (TODO once we have domain trust)
 *   Outside business hours (UTC)      | -5   (cron sanity check)
 *
 * Clamped to [0, 100]. Anything ≥ 80 displayed as "high confidence" in UI.
 *
 * Future: bump real ML scoring per-customer per-tool from feedback signal
 * (approval-patterns.ts already aggregates approve/reject ratios).
 */

// Tool names that write to the customer's connected integrations. Empty
// while no integration toolkits are registered — add names here when
// integration toolkits return.
export const DESTRUCTIVE_TOOLS: ReadonlySet<string> = new Set([])

export type ConfidenceInput = {
  toolName: string
  args: Record<string, unknown>
  summary?: string
  /** ISO timestamp; defaults to now. */
  now?: Date
}

export type ConfidenceResult = {
  score: number                          // 0-100
  band: 'low' | 'medium' | 'high'
  factors: Array<{ delta: number; reason: string }>
}

export function scoreActionConfidence(input: ConfidenceInput): ConfidenceResult {
  const factors: Array<{ delta: number; reason: string }> = []
  let score = 60
  factors.push({ delta: 60, reason: 'base' })

  const destructive = DESTRUCTIVE_TOOLS.has(input.toolName)
  if (destructive) {
    score -= 10
    factors.push({ delta: -10, reason: 'destructive tool' })
  } else {
    score += 30
    factors.push({ delta: 30, reason: 'read-only tool' })
  }

  if (input.summary && input.summary.trim().length > 8) {
    score += 5
    factors.push({ delta: 5, reason: 'has summary' })
  }

  if (typeof input.args.to === 'string' && input.args.to.includes('@')) {
    score += 5
    factors.push({ delta: 5, reason: 'recipient targeted' })
  }

  if (typeof input.args.threadId === 'string' && input.args.threadId.length > 0) {
    score += 10
    factors.push({ delta: 10, reason: 'replying in thread' })
  }

  const now = input.now ?? new Date()
  const hour = now.getUTCHours()
  if (hour < 6 || hour >= 22) {
    score -= 5
    factors.push({ delta: -5, reason: 'outside business hours' })
  }

  score = Math.max(0, Math.min(100, score))
  const band: ConfidenceResult['band'] =
    score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low'

  return { score, band, factors }
}
