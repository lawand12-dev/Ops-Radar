/**
 * Three-tier memory architecture — Tier 2 (raw event warehouse) types (CP-25).
 *
 * Every source (Stripe, HubSpot, Harvest, etc.) ingests events into the
 * `external_events` table via recordEvent / recordEvents. The AI agents
 * query history via queryEvents / aggregateByMonth.
 *
 * See docs/strategy/three-tier-memory-architecture-2026.md for the full design.
 */

import type { Json } from '<npm>/lib/database.types'

/** Canonical source names — must match what the tool agents emit. */
export type EventSource =
  | 'stripe'
  | 'hubspot'
  | 'pipedrive'
  | 'apollo'
  | 'clickup'
  | 'asana'
  | 'monday'
  | 'harvest'
  | 'toggl'
  | 'gmail'
  | 'slack'
  | 'calendly'
  | 'notion'
  | 'google_calendar'
  | 'google_analytics'
  | 'google_ads'
  | 'linkedin'
  | 'quickbooks'
  | 'xero'
  | 'bamboo_hr'
  | 'gusto'
  | 'typeform'
  | 'intercom'
  | 'zendesk'
  | 'docusign'
  | (string & {})

export type ExternalEvent = {
  id: string
  user_id: string
  source: EventSource
  event_type: string
  external_id: string
  occurred_at: string
  amount_cents: number | null
  client_external_id: string | null
  payload: Json
  created_at: string
}

export type RecordEventInput = {
  userId: string
  source: EventSource
  eventType: string
  externalId: string
  occurredAt: Date | string
  amountCents?: number | null
  clientExternalId?: string | null
  payload?: Record<string, unknown>
}

export type QueryEventsInput = {
  userId: string
  source?: EventSource
  eventType?: string
  clientExternalId?: string
  occurredAfter?: Date | string
  occurredBefore?: Date | string
  limit?: number
}

export type AggregateByMonthInput = {
  userId: string
  source: EventSource
  eventType?: string
  clientExternalId?: string
  occurredAfter?: Date | string
  occurredBefore?: Date | string
}

export type MonthlyAggregate = {
  month: string // ISO date for first-of-month
  count: number
  sum_amount_cents: number
}
