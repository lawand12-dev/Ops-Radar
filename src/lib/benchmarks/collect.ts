/**
 * STUB — Composio dependency removed 2026-05-26 during Nango migration.
 * Type exports preserved so consumers still compile. Function bodies
 * return empty data and log a warning. Rebuild on Nango per CP-45 plan.
 */

import type { BenchmarkMetric } from './types'

export type UserMetrics = Partial<Record<BenchmarkMetric, number>>

export async function collectUserMetrics(args: {
  userId: string
  stripeConnected: boolean
  harvestConnected: boolean
  blendedRate: number | null
}): Promise<UserMetrics> {
  void args
  console.warn('[STUB] collectUserMetrics — composio-to-nango migration in progress')
  return {}
}
