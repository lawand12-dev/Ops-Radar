/**
 * STUB — Composio dependency removed 2026-05-26 during Nango migration.
 * Type exports preserved so consumers still compile. Function bodies
 * return empty data and log a warning. Rebuild on Nango per CP-45 plan.
 */

import type { EventSource } from './types'

export type BackfillSource = EventSource

export type BackfillResult = {
  source: BackfillSource
  status: 'succeeded' | 'skipped' | 'failed'
  inserted?: number
  failed?: number
  reason?: string
}

export type BackfillSummary = {
  userId: string
  startedAt: string
  finishedAt: string
  durationSec: number
  results: BackfillResult[]
  totalInserted: number
  totalFailed: number
}

export async function backfillHistory(userId: string): Promise<BackfillSummary> {
  void userId
  console.warn('[STUB] backfillHistory — composio-to-nango migration in progress')
  const now = new Date().toISOString()
  return {
    userId,
    startedAt: now,
    finishedAt: now,
    durationSec: 0,
    results: [],
    totalInserted: 0,
    totalFailed: 0,
  }
}
