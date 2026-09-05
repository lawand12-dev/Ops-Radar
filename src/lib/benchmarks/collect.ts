/**
 * STUB — Nango wire-up pending (engine demolished 2026-05-26)
 * Type exports preserved so consumers still compile. Function bodies
 * return empty data and log a warning. Wire to Nango per the Gmail-first plan when ready.
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
  console.warn('[STUB] collectUserMetrics — nango wire-up pending')
  return {}
}
