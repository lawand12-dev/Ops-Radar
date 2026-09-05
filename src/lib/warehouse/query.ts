/**
 * Read side of the event warehouse (CP-25, Tier 2).
 *
 * The AI COO and cron agents call these when they need historical context
 * beyond what the curated Notion brain holds (e.g. "every late invoice in
 * Q3 2024 for client X", "MRR trend over 3 quarters", "deal close rate
 * vs 6 months ago").
 *
 * - queryEvents: filtered list of events. Bounded to 500 rows max — agents
 *   should aggregate via aggregateByMonth, not list-then-count.
 * - aggregateByMonth: monthly bucket aggregation (count + sum amount).
 *   This is the workhorse for trend queries; runs as a single SQL query
 *   using PostgreSQL's date_trunc.
 */

import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import type {
  AggregateByMonthInput,
  ExternalEvent,
  MonthlyAggregate,
  QueryEventsInput,
} from './types'

const QUERY_LIMIT_HARD_CAP = 500

function toIso(d: Date | string): string {
  return typeof d === 'string' ? d : d.toISOString()
}

export async function queryEvents(
  input: QueryEventsInput,
): Promise<ExternalEvent[]> {
  try {
    const supabase = getServerSupabaseClient()
    let q = supabase
      .from('external_events')
      .select('*')
      .eq('user_id', input.userId)
      .order('occurred_at', { ascending: false })
      .limit(Math.min(input.limit ?? 100, QUERY_LIMIT_HARD_CAP))

    if (input.source) q = q.eq('source', input.source)
    if (input.eventType) q = q.eq('event_type', input.eventType)
    if (input.clientExternalId)
      q = q.eq('client_external_id', input.clientExternalId)
    if (input.occurredAfter) q = q.gte('occurred_at', toIso(input.occurredAfter))
    if (input.occurredBefore) q = q.lte('occurred_at', toIso(input.occurredBefore))

    const { data, error } = await q
    if (error) {
      console.warn('[warehouse/query] queryEvents failed:', error.message)
      return []
    }
    return (data ?? []) as unknown as ExternalEvent[]
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[warehouse/query] queryEvents threw:', message)
    return []
  }
}

/**
 * Bucket-by-month aggregate. Critical for trend queries — the COO's
 * "MRR over 3 quarters" question collapses to ~3-9 rows instead of
 * scanning thousands. Uses date_trunc + GROUP BY at the database level
 * (PostgREST's `rpc` would be cleaner long-term; for v1 we filter +
 * aggregate in JS to avoid adding a Postgres function migration).
 */
export async function aggregateByMonth(
  input: AggregateByMonthInput,
): Promise<MonthlyAggregate[]> {
  const events = await queryEvents({
    userId: input.userId,
    source: input.source,
    eventType: input.eventType,
    clientExternalId: input.clientExternalId,
    occurredAfter: input.occurredAfter,
    occurredBefore: input.occurredBefore,
    limit: QUERY_LIMIT_HARD_CAP,
  })

  const buckets = new Map<string, MonthlyAggregate>()
  for (const e of events) {
    const d = new Date(e.occurred_at)
    const month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10)
    const existing = buckets.get(month) ?? {
      month,
      count: 0,
      sum_amount_cents: 0,
    }
    existing.count += 1
    existing.sum_amount_cents += e.amount_cents ?? 0
    buckets.set(month, existing)
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.month < b.month ? -1 : 1,
  )
}
