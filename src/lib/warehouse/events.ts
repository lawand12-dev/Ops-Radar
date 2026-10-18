/**
 * Write side of the event warehouse (CP-25, Tier 2).
 *
 * - recordEvent: single-row insert, idempotent via the (user, source,
 *   external_id) unique index. If the same event hits us twice (webhook
 *   retry, backfill re-run), the second insert is a no-op.
 * - recordEvents: batch insert for backfill jobs (12 months of history, etc.).
 *   Splits into chunks of 500 to stay under Postgres parameter limits.
 *
 * Both fire-and-forget — a write failure logs and continues. The agents'
 * primary memory is Notion; the warehouse is the deep historical context.
 * Losing one event in 50,000 is not worth blocking the calling agent.
 */

import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import type { Json } from '<npm>/lib/database.types'
import type { RecordEventInput } from './types'

const BATCH_SIZE = 500

function toIso(d: Date | string): string {
  return typeof d === 'string' ? d : d.toISOString()
}

function toRow(input: RecordEventInput) {
  return {
    user_id: input.userId,
    source: input.source,
    event_type: input.eventType,
    external_id: input.externalId,
    occurred_at: toIso(input.occurredAt),
    amount_cents: input.amountCents ?? null,
    client_external_id: input.clientExternalId ?? null,
    payload: ((input.payload ?? {}) as unknown) as Json,
  }
}

export async function recordEvent(input: RecordEventInput): Promise<void> {
  try {
    const supabase = getServerSupabaseClient()
    const { error } = await supabase
      .from('external_events')
      .upsert(toRow(input), {
        onConflict: 'user_id,source,external_id',
        ignoreDuplicates: true,
      })
    if (error) {
      console.warn('[warehouse/events] recordEvent failed:', error.message)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[warehouse/events] recordEvent threw:', message)
  }
}

export async function recordEvents(events: RecordEventInput[]): Promise<{
  inserted: number
  failed: number
}> {
  if (events.length === 0) return { inserted: 0, failed: 0 }

  const supabase = getServerSupabaseClient()
  let inserted = 0
  let failed = 0

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const chunk = events.slice(i, i + BATCH_SIZE).map(toRow)
    try {
      const { error, count } = await supabase
        .from('external_events')
        .upsert(chunk, {
          onConflict: 'user_id,source,external_id',
          ignoreDuplicates: true,
          count: 'estimated',
        })
      if (error) {
        console.warn(
          '[warehouse/events] batch upsert failed:',
          error.message,
          'chunk size',
          chunk.length,
        )
        failed += chunk.length
      } else {
        inserted += count ?? chunk.length
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn('[warehouse/events] batch upsert threw:', message)
      failed += chunk.length
    }
  }

  return { inserted, failed }
}
