/**
 * 12-month historical backfill (CP-31).
 *
 * Pulls 12 months of raw events from each connected Composio toolkit
 * and writes them into the warehouse (external_events table) in
 * parallel. Triggered from the Composio connect webhook on the FIRST
 * Notion connect (or on demand via /api/dashboard/backfill/trigger).
 *
 * Design constraints (per research doc):
 *  - Single 300s Vercel function, fire-and-forget
 *  - Parallel Promise.all across all connected toolkits
 *  - Per-toolkit pagination + dedupe via the unique (user_id, source,
 *    external_id) index on external_events
 *  - Estimated wall-clock: 3-5 minutes for ~22 toolkits with full
 *    12-month history (~9k Stripe txns, ~15k HubSpot events, etc.)
 *
 * Implementation notes:
 *  - Each per-toolkit function returns counts; failures log but don't
 *    block other toolkits
 *  - We use the existing Composio singleton + the customer's connected
 *    toolkit list (composio_connections table) as the source of work
 *  - The actual API call shape is Composio's tools.execute() — we don't
 *    construct REST calls ourselves
 */

import { getComposio } from '<npm>/lib/composio'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { recordEvents } from './events'
import type { EventSource, RecordEventInput } from './types'

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

const WINDOW_MS = 365 * 24 * 60 * 60 * 1000 // 12 months

// Per-source action slugs (Composio's action names). Each backfill
// function uses the canonical "list / search" action for that toolkit.
const STRIPE_BALANCE_TX_ACTION = 'STRIPE_LIST_BALANCE_TRANSACTIONS'
const STRIPE_INVOICES_ACTION = 'STRIPE_LIST_INVOICES'
const HUBSPOT_DEALS_ACTION = 'HUBSPOT_SEARCH_DEALS'
const HUBSPOT_CONTACTS_ACTION = 'HUBSPOT_SEARCH_CONTACTS'
const HARVEST_TIME_ENTRIES_ACTION = 'HARVEST_LIST_TIME_ENTRIES'
const CLICKUP_TASKS_ACTION = 'CLICKUP_GET_FILTERED_TEAM_TASKS'
const PIPEDRIVE_DEALS_ACTION = 'PIPEDRIVE_GET_DEALS'

// ─── Public orchestrator ──────────────────────────────────────────────────

/**
 * Top-level entry. Reads the customer's connected toolkits, fans out
 * the per-source backfill functions in parallel, returns a summary.
 *
 * Safe to call repeatedly — every insert uses upsert(ignoreDuplicates)
 * on the (user_id, source, external_id) unique index.
 */
export async function backfillHistory(userId: string): Promise<BackfillSummary> {
  const startedAt = new Date()
  const supabase = getServerSupabaseClient()

  // Discover connected toolkits
  const { data: connections } = await supabase
    .from('composio_connections')
    .select('tool_slug')
    .eq('user_id', userId)
    .eq('is_active', true)
  const connected = new Set((connections ?? []).map((c) => c.tool_slug as string))

  // Build the per-source task list — only run for toolkits actually connected.
  const tasks: Promise<BackfillResult>[] = []
  const since = new Date(Date.now() - WINDOW_MS)

  if (connected.has('stripe')) tasks.push(backfillStripe(userId, since))
  if (connected.has('hubspot')) tasks.push(backfillHubspot(userId, since))
  if (connected.has('harvest')) tasks.push(backfillHarvest(userId, since))
  if (connected.has('clickup')) tasks.push(backfillClickUp(userId, since))
  if (connected.has('pipedrive')) tasks.push(backfillPipedrive(userId, since))

  // Run all per-toolkit backfills in parallel. Each one returns its own
  // result; failures don't break others.
  const settled = await Promise.allSettled(tasks)
  const results: BackfillResult[] = settled.map((s) =>
    s.status === 'fulfilled'
      ? s.value
      : { source: 'unknown' as BackfillSource, status: 'failed', reason: String(s.reason).slice(0, 200) },
  )

  const finishedAt = new Date()
  const totalInserted = results.reduce((sum, r) => sum + (r.inserted ?? 0), 0)
  const totalFailed = results.reduce((sum, r) => sum + (r.failed ?? 0), 0)

  return {
    userId,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationSec: Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000),
    results,
    totalInserted,
    totalFailed,
  }
}

// ─── Per-source backfill functions ─────────────────────────────────────────
//
// Each function follows the same shape:
//   1. Page through the Composio action with a 12mo window
//   2. Map each raw item to a RecordEventInput
//   3. Call recordEvents() in batches
//   4. Return BackfillResult
//
// Failures (rate limits, auth, etc.) log + return status:'failed' with reason.

async function backfillStripe(userId: string, since: Date): Promise<BackfillResult> {
  try {
    const composio = getComposio()
    const events: RecordEventInput[] = []
    let cursor: string | undefined
    let pages = 0
    const maxPages = 50 // ~5,000 transactions hard cap

    // Stripe BALANCE_TRANSACTIONS — every charge, refund, payout, fee.
    while (pages < maxPages) {
      const response = (await composio.tools.execute(STRIPE_BALANCE_TX_ACTION, {
        userId,
        arguments: {
          limit: 100,
          starting_after: cursor,
          created: { gte: Math.floor(since.getTime() / 1000) },
        } as unknown as Record<string, unknown>,
      })) as { data?: { data?: Array<Record<string, unknown>>; has_more?: boolean } }

      const items = response.data?.data ?? []
      if (items.length === 0) break

      for (const item of items) {
        const id = item.id as string | undefined
        const created = item.created as number | undefined
        if (!id || !created) continue
        events.push({
          userId,
          source: 'stripe',
          eventType: `balance_transaction.${(item.type as string) ?? 'unknown'}`,
          externalId: id,
          occurredAt: new Date(created * 1000),
          amountCents: (item.amount as number | undefined) ?? null,
          clientExternalId: (item.source as string | undefined) ?? null,
          payload: item,
        })
      }
      if (!response.data?.has_more) break
      cursor = items[items.length - 1]?.id as string | undefined
      pages++
    }

    // Also pull invoices for the same window (separate object, useful
    // for AR aging questions).
    let invoiceCursor: string | undefined
    pages = 0
    while (pages < maxPages) {
      const response = (await composio.tools.execute(STRIPE_INVOICES_ACTION, {
        userId,
        arguments: {
          limit: 100,
          starting_after: invoiceCursor,
          created: { gte: Math.floor(since.getTime() / 1000) },
        } as unknown as Record<string, unknown>,
      })) as { data?: { data?: Array<Record<string, unknown>>; has_more?: boolean } }

      const items = response.data?.data ?? []
      if (items.length === 0) break

      for (const item of items) {
        const id = item.id as string | undefined
        const created = item.created as number | undefined
        if (!id || !created) continue
        events.push({
          userId,
          source: 'stripe',
          eventType: `invoice.${(item.status as string) ?? 'unknown'}`,
          externalId: id,
          occurredAt: new Date(created * 1000),
          amountCents: (item.amount_due as number | undefined) ?? (item.total as number | undefined) ?? null,
          clientExternalId: (item.customer as string | undefined) ?? null,
          payload: item,
        })
      }
      if (!response.data?.has_more) break
      invoiceCursor = items[items.length - 1]?.id as string | undefined
      pages++
    }

    const result = await recordEvents(events)
    return {
      source: 'stripe',
      status: 'succeeded',
      inserted: result.inserted,
      failed: result.failed,
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return { source: 'stripe', status: 'failed', reason: reason.slice(0, 200) }
  }
}

async function backfillHubspot(userId: string, since: Date): Promise<BackfillResult> {
  try {
    const composio = getComposio()
    const events: RecordEventInput[] = []
    const sinceIso = since.toISOString()
    let after: string | undefined
    let pages = 0
    const maxPages = 30 // ~3,000 deals

    while (pages < maxPages) {
      const response = (await composio.tools.execute(HUBSPOT_DEALS_ACTION, {
        userId,
        arguments: {
          after,
          limit: 100,
          properties: ['dealname', 'amount', 'dealstage', 'closedate', 'hs_lastmodifieddate', 'hubspot_owner_id', 'pipeline'],
          filterGroups: [
            {
              filters: [{ propertyName: 'hs_lastmodifieddate', operator: 'GTE', value: sinceIso }],
            },
          ],
        } as unknown as Record<string, unknown>,
      })) as { data?: { results?: Array<Record<string, unknown>>; paging?: { next?: { after?: string } } } }

      const items = response.data?.results ?? []
      if (items.length === 0) break

      for (const item of items) {
        const id = item.id as string | undefined
        if (!id) continue
        const props = (item.properties as Record<string, unknown>) ?? {}
        const lastModified = props.hs_lastmodifieddate as string | undefined
        const amount = props.amount as string | undefined
        events.push({
          userId,
          source: 'hubspot',
          eventType: `deal.${(props.dealstage as string) ?? 'unknown'}`,
          externalId: id,
          occurredAt: lastModified ? new Date(lastModified) : new Date(),
          amountCents: amount ? Math.round(Number(amount) * 100) : null,
          clientExternalId: id,
          payload: item,
        })
      }
      const nextAfter = response.data?.paging?.next?.after
      if (!nextAfter) break
      after = nextAfter
      pages++
    }

    const result = await recordEvents(events)
    return { source: 'hubspot', status: 'succeeded', inserted: result.inserted, failed: result.failed }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return { source: 'hubspot', status: 'failed', reason: reason.slice(0, 200) }
  }
}

async function backfillHarvest(userId: string, since: Date): Promise<BackfillResult> {
  try {
    const composio = getComposio()
    const events: RecordEventInput[] = []
    let page = 1
    const maxPages = 30 // up to ~3,000 time entries (Harvest pages of 100)

    while (page <= maxPages) {
      const response = (await composio.tools.execute(HARVEST_TIME_ENTRIES_ACTION, {
        userId,
        arguments: {
          from: since.toISOString().slice(0, 10),
          page,
          per_page: 100,
        } as unknown as Record<string, unknown>,
      })) as { data?: { time_entries?: Array<Record<string, unknown>>; total_pages?: number } }

      const items = response.data?.time_entries ?? []
      if (items.length === 0) break

      for (const item of items) {
        const id = item.id as number | string | undefined
        if (id == null) continue
        const spent = item.spent_date as string | undefined
        const hours = item.hours as number | undefined
        events.push({
          userId,
          source: 'harvest',
          eventType: 'time_entry',
          externalId: String(id),
          occurredAt: spent ? new Date(spent) : new Date(),
          amountCents: hours != null ? Math.round(hours * 100) : null, // hours × 100 (proxy)
          clientExternalId: (item.client as { id?: number } | undefined)?.id?.toString() ?? null,
          payload: item,
        })
      }
      const totalPages = response.data?.total_pages ?? 1
      if (page >= totalPages) break
      page++
    }

    const result = await recordEvents(events)
    return { source: 'harvest', status: 'succeeded', inserted: result.inserted, failed: result.failed }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return { source: 'harvest', status: 'failed', reason: reason.slice(0, 200) }
  }
}

async function backfillClickUp(userId: string, since: Date): Promise<BackfillResult> {
  try {
    const composio = getComposio()
    const events: RecordEventInput[] = []
    let page = 0
    const maxPages = 20

    while (page < maxPages) {
      const response = (await composio.tools.execute(CLICKUP_TASKS_ACTION, {
        userId,
        arguments: {
          page,
          date_updated_gt: since.getTime(),
          subtasks: false,
          include_closed: true,
        } as unknown as Record<string, unknown>,
      })) as { data?: { tasks?: Array<Record<string, unknown>>; last_page?: boolean } }

      const items = response.data?.tasks ?? []
      if (items.length === 0) break

      for (const item of items) {
        const id = item.id as string | undefined
        if (!id) continue
        const updated = item.date_updated as string | undefined
        events.push({
          userId,
          source: 'clickup',
          eventType: `task.${((item.status as { status?: string } | undefined)?.status) ?? 'unknown'}`,
          externalId: id,
          occurredAt: updated ? new Date(Number(updated)) : new Date(),
          amountCents: null,
          clientExternalId: null,
          payload: item,
        })
      }
      if (response.data?.last_page) break
      page++
    }

    const result = await recordEvents(events)
    return { source: 'clickup', status: 'succeeded', inserted: result.inserted, failed: result.failed }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return { source: 'clickup', status: 'failed', reason: reason.slice(0, 200) }
  }
}

async function backfillPipedrive(userId: string, since: Date): Promise<BackfillResult> {
  try {
    const composio = getComposio()
    const events: RecordEventInput[] = []
    let start = 0
    const maxPages = 20
    const sinceIso = since.toISOString().slice(0, 10)

    for (let i = 0; i < maxPages; i++) {
      const response = (await composio.tools.execute(PIPEDRIVE_DEALS_ACTION, {
        userId,
        arguments: {
          start,
          limit: 100,
          updated_since: sinceIso,
          sort: 'update_time DESC',
        } as unknown as Record<string, unknown>,
      })) as { data?: { data?: Array<Record<string, unknown>>; additional_data?: { pagination?: { more_items_in_collection?: boolean; next_start?: number } } } }

      const items = response.data?.data ?? []
      if (items.length === 0) break

      for (const item of items) {
        const id = item.id as number | string | undefined
        if (id == null) continue
        const updated = item.update_time as string | undefined
        const value = item.value as number | undefined
        events.push({
          userId,
          source: 'pipedrive',
          eventType: `deal.${(item.status as string) ?? 'unknown'}`,
          externalId: String(id),
          occurredAt: updated ? new Date(updated) : new Date(),
          amountCents: value != null ? Math.round(value * 100) : null,
          clientExternalId: (item.org_id as { value?: number } | undefined)?.value?.toString() ?? null,
          payload: item,
        })
      }
      const more = response.data?.additional_data?.pagination?.more_items_in_collection
      if (!more) break
      start = response.data?.additional_data?.pagination?.next_start ?? start + 100
    }

    const result = await recordEvents(events)
    return { source: 'pipedrive', status: 'succeeded', inserted: result.inserted, failed: result.failed }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return { source: 'pipedrive', status: 'failed', reason: reason.slice(0, 200) }
  }
}
