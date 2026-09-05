/**
 * STUB — Nango wire-up pending (engine demolished 2026-05-26)
 * Type exports preserved so consumers still compile. Function bodies
 * return empty data and log a warning. Wire to Nango per the Gmail-first plan when ready.
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
  console.warn('[STUB] backfillHistory — nango wire-up pending')
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
