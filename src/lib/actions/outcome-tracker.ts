/**
 * Action outcome tracking — Gap 1 of the closed-loop memory architecture.
 *
 * The story this code makes possible:
 *   1. An agent (Collections, Renewal, etc.) queues an action ("draft reminder
 *      for invoice in_abc"). The owner approves it.
 *   2. `trackAction()` writes a row to `action_tracking` linking the agent's
 *      queued action to the underlying business entity (a Stripe invoice, a
 *      DocuSign contract, a HubSpot deal, etc.) and snapshots the entity's
 *      baseline state.
 *   3. Hours/days later, the entity state changes upstream — the invoice gets
 *      paid, the contract gets renewed, the deal closes won.
 *   4. `checkOutcomes()` (called hourly by Vercel Cron, and on-demand by other
 *      agents) re-fetches each pending entity via Composio, compares the new
 *      state to the baseline, and — when the expected outcome materializes —
 *      flips `outcome_detected = true`, populates `outcome_value_usd`, and
 *      (optionally) appends a "value recovered" row to the customer's Notion
 *      Agent Action Log.
 *   5. `getRecentWins()` is how downstream agents and the dashboard surface
 *      this — "Collections Agent recovered $4,500 from in_abc last week."
 *
 * No client business data is persisted in OpsRadar except the *outcome metadata*
 * (entity_id, expected_outcome, baseline snapshot of state fields the evaluator
 * needs, and the detected outcome value). Full entity payloads stay in the
 * source tool — we live-fetch them each check.
 *
 * Composio action slugs marked `TODO(composio-slug): verify slug` are best
 * guesses from Composio's `<TOOLKIT>_<VERB>_<NOUN>` convention. Verify each
 * before flipping outcome tracking on in production.
 */

import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import {
  executeComposioAction,
  ComposioNotConnectedError,
  ComposioExecuteError,
} from '<npm>/lib/composio-fetch'
import { appendActionLog } from '<npm>/lib/notion/helpers'
import type { Json } from '<npm>/lib/database.types'
import type { AgentSlug } from '<npm>/lib/agents/types'
import type { ToolSlug } from '<npm>/lib/composio'

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type TrackedEntityType = 'invoice' | 'deal' | 'contract' | 'project' | 'task'

/**
 * Agent slug for tracking — any of the 10 registered agents, plus 'coo' for
 * actions queued directly by the chat agent. The DB column is a plain string.
 */
export type TrackerAgentSlug = AgentSlug | 'coo'

export type TrackActionInput = {
  userId: string
  agentActionId: string
  agentSlug: TrackerAgentSlug
  entityType: TrackedEntityType
  entityId: string
  entityToolSlug: ToolSlug
  expectedOutcome?: string
  baselineState?: Record<string, unknown>
}

export type CheckOutcomesResult = {
  checked: number
  detected: number
  totalValueUsd: number
}

export type RecentWin = {
  agentSlug: string
  entityType: string
  entityId: string
  outcomeValueUsd: number
  outcomeDetectedAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// trackAction — link a queued action to the entity we want to watch.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insert a new row into `action_tracking`. Called immediately after an agent
 * queues an action via `agent_actions`. Idempotent on (agent_action_id) is NOT
 * enforced at the DB level — callers are responsible for not double-tracking.
 */
export async function trackAction(input: TrackActionInput): Promise<{ id: string }> {
  const supabase = getServerSupabaseClient()

  const baseline = (input.baselineState ?? {}) as Json
  const { data, error } = await supabase
    .from('action_tracking')
    .insert({
      user_id: input.userId,
      agent_action_id: input.agentActionId,
      agent_slug: input.agentSlug,
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_tool_slug: input.entityToolSlug,
      expected_outcome: input.expectedOutcome ?? null,
      baseline_state: baseline,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(
      `trackAction failed: ${error?.message ?? 'no row returned'}`,
    )
  }

  return { id: data.id }
}

// ─────────────────────────────────────────────────────────────────────────────
// checkOutcomes — re-fetch each pending entity and flip rows where the
//                 expected outcome has materialized.
// ─────────────────────────────────────────────────────────────────────────────

type PendingRow = {
  id: string
  user_id: string
  agent_action_id: string | null
  agent_slug: string
  entity_type: string
  entity_id: string
  entity_tool_slug: string
  expected_outcome: string | null
  baseline_state: Json
}

type EntitySnapshot = {
  status: string | null
  valueUsd: number
  raw: Record<string, unknown>
}

/**
 * Iterate every pending tracking row for `userId` (outcome_detected = false),
 * re-fetch the entity from its source tool via Composio, compare to baseline,
 * and update the row in place if the expected outcome has materialized.
 */
export async function checkOutcomes(userId: string): Promise<CheckOutcomesResult> {
  const supabase = getServerSupabaseClient()

  const { data: rows, error } = await supabase
    .from('action_tracking')
    .select(
      'id, user_id, agent_action_id, agent_slug, entity_type, entity_id, entity_tool_slug, expected_outcome, baseline_state',
    )
    .eq('user_id', userId)
    .eq('outcome_detected', false)

  if (error) {
    console.error('[outcome-tracker] pending rows query failed', error)
    return { checked: 0, detected: 0, totalValueUsd: 0 }
  }

  const pending = (rows ?? []) as PendingRow[]
  let detected = 0
  let totalValueUsd = 0

  for (const row of pending) {
    const checkedAt = new Date().toISOString()

    let snapshot: EntitySnapshot | null = null
    try {
      snapshot = await fetchEntitySnapshot(row)
    } catch (err) {
      if (
        err instanceof ComposioNotConnectedError ||
        err instanceof ComposioExecuteError
      ) {
        // Customer disconnected the tool, or transient API error. Bump
        // last_checked_at so we don't hammer the same dead row each cron tick.
        await supabase
          .from('action_tracking')
          .update({
            last_checked_at: checkedAt,
            current_state: { error: err.message } as Json,
          })
          .eq('id', row.id)
        continue
      }
      // Unknown error — log and move on.
      console.error('[outcome-tracker] snapshot failed', row.id, err)
      continue
    }

    if (!snapshot) {
      await supabase
        .from('action_tracking')
        .update({ last_checked_at: checkedAt })
        .eq('id', row.id)
      continue
    }

    const matched = outcomeMatches(row, snapshot)

    if (matched) {
      const valueUsd = snapshot.valueUsd
      const { error: updErr } = await supabase
        .from('action_tracking')
        .update({
          last_checked_at: checkedAt,
          current_state: snapshot.raw as Json,
          outcome_detected: true,
          outcome_detected_at: checkedAt,
          outcome_value_usd: valueUsd,
        })
        .eq('id', row.id)

      if (updErr) {
        console.error('[outcome-tracker] update failed', row.id, updErr)
        continue
      }
      detected += 1
      totalValueUsd += valueUsd

      // Bonus: append a "Value recovered/saved" row to Notion. Wrapped because
      // Notion writes must never block outcome detection.
      try {
        await appendActionLog(userId, {
          action: `${labelForAgent(row.agent_slug)} outcome detected — ${row.entity_type} ${row.entity_id}`,
          agent: labelForAgent(row.agent_slug),
          date: checkedAt.slice(0, 10),
          trigger: `Tracked ${row.entity_type} ${row.entity_id} since action was queued.`,
          actionTaken: `Outcome "${row.expected_outcome ?? 'state change'}" detected. Value recovered/saved: $${valueUsd}.`,
          outcome: 'Resolved',
          valueRecoveredOrSaved: valueUsd,
        })
      } catch (notionErr) {
        // Silent — Notion may not be connected for this user; that's fine.
        console.warn(
          '[outcome-tracker] Notion appendActionLog skipped',
          notionErr instanceof Error ? notionErr.message : notionErr,
        )
      }
    } else {
      await supabase
        .from('action_tracking')
        .update({
          last_checked_at: checkedAt,
          current_state: snapshot.raw as Json,
        })
        .eq('id', row.id)
    }
  }

  return {
    checked: pending.length,
    detected,
    totalValueUsd: Math.round(totalValueUsd * 100) / 100,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getRecentWins — helper for agents + UI to surface "wins" in summaries.
// ─────────────────────────────────────────────────────────────────────────────

export async function getRecentWins(
  userId: string,
  sinceDays: number = 7,
): Promise<RecentWin[]> {
  const supabase = getServerSupabaseClient()
  const since = new Date(Date.now() - sinceDays * 86400 * 1000).toISOString()

  const { data, error } = await supabase
    .from('action_tracking')
    .select(
      'agent_slug, entity_type, entity_id, outcome_value_usd, outcome_detected_at',
    )
    .eq('user_id', userId)
    .eq('outcome_detected', true)
    .gte('outcome_detected_at', since)
    .order('outcome_detected_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[outcome-tracker] getRecentWins failed', error)
    return []
  }

  return (data ?? []).map((r) => ({
    agentSlug: r.agent_slug,
    entityType: r.entity_type,
    entityId: r.entity_id,
    outcomeValueUsd: r.outcome_value_usd ?? 0,
    outcomeDetectedAt: r.outcome_detected_at ?? '',
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Internals — per-tool entity fetch + outcome comparison
// ─────────────────────────────────────────────────────────────────────────────

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

/**
 * Re-fetch the entity's current state via Composio. Returns null if we don't
 * know how to refresh this entity_type/entity_tool_slug combo (so the row gets
 * skipped without erroring out).
 */
async function fetchEntitySnapshot(row: PendingRow): Promise<EntitySnapshot | null> {
  const tool = row.entity_tool_slug as ToolSlug
  const id = row.entity_id

  switch (row.entity_type) {
    case 'invoice': {
      if (tool === 'stripe') {
        // TODO(composio-slug): verify STRIPE_RETRIEVE_INVOICE
        const inv = await executeComposioAction<Record<string, unknown>>(
          row.user_id,
          'stripe',
          'STRIPE_RETRIEVE_INVOICE',
          { invoice: id },
        )
        const obj = asRecord(inv)
        const status = typeof obj.status === 'string' ? obj.status : null
        const paid = toNumber(obj.amount_paid) / 100
        const due = toNumber(obj.amount_due) / 100
        return {
          status,
          valueUsd: paid > 0 ? paid : due,
          raw: obj,
        }
      }
      return null
    }

    case 'deal': {
      if (tool === 'hubspot') {
        // TODO(composio-slug): verify HUBSPOT_GET_DEAL
        const deal = await executeComposioAction<Record<string, unknown>>(
          row.user_id,
          'hubspot',
          'HUBSPOT_GET_DEAL',
          { dealId: id },
        )
        const obj = asRecord(deal)
        const props = asRecord(obj.properties)
        const amount = toNumber(props.amount)
        const stage = String(props.dealstage ?? '').toLowerCase()
        const isWon =
          props.hs_is_closed_won === 'true' ||
          props.hs_is_closed_won === true ||
          stage.includes('won')
        const isLost = stage.includes('lost')
        const status = isWon ? 'closed-won' : isLost ? 'closed-lost' : 'open'
        return { status, valueUsd: amount, raw: obj }
      }
      if (tool === 'pipedrive') {
        // TODO(composio-slug): verify PIPEDRIVE_GET_DEAL
        const deal = await executeComposioAction<Record<string, unknown>>(
          row.user_id,
          'pipedrive',
          'PIPEDRIVE_GET_DEAL',
          { id },
        )
        const obj = asRecord(deal)
        const status = String(obj.status ?? '').toLowerCase() || null
        const value = toNumber(obj.value)
        return { status, valueUsd: value, raw: obj }
      }
      return null
    }

    case 'contract': {
      if (tool === 'docusign') {
        // TODO(composio-slug): verify DOCUSIGN_GET_ENVELOPE
        const env = await executeComposioAction<Record<string, unknown>>(
          row.user_id,
          'docusign',
          'DOCUSIGN_GET_ENVELOPE',
          { envelopeId: id },
        )
        const obj = asRecord(env)
        const status = typeof obj.status === 'string' ? obj.status.toLowerCase() : null
        // Contract value isn't always present in DocuSign — try customFields.
        const fields = (asRecord(obj.customFields).textCustomFields ?? []) as Array<{
          name?: unknown
          value?: unknown
        }>
        const valueField = Array.isArray(fields)
          ? fields.find((f) => String(f.name ?? '').toLowerCase().includes('value'))
          : undefined
        return {
          status,
          valueUsd: toNumber(valueField?.value),
          raw: obj,
        }
      }
      return null
    }

    case 'project': {
      if (tool === 'clickup') {
        // TODO(composio-slug): verify CLICKUP_GET_LIST (project = list in ClickUp)
        const list = await executeComposioAction<Record<string, unknown>>(
          row.user_id,
          'clickup',
          'CLICKUP_GET_LIST',
          { list_id: id },
        )
        const obj = asRecord(list)
        const status = typeof obj.status === 'string' ? obj.status : null
        return { status, valueUsd: 0, raw: obj }
      }
      if (tool === 'harvest') {
        // TODO(composio-slug): verify HARVEST_GET_PROJECT
        const proj = await executeComposioAction<Record<string, unknown>>(
          row.user_id,
          'harvest',
          'HARVEST_GET_PROJECT',
          { project_id: id },
        )
        const obj = asRecord(proj)
        const status = obj.is_active === false ? 'archived' : 'active'
        return { status, valueUsd: toNumber(obj.budget), raw: obj }
      }
      return null
    }

    case 'task': {
      if (tool === 'clickup') {
        // TODO(composio-slug): verify CLICKUP_GET_TASK
        const task = await executeComposioAction<Record<string, unknown>>(
          row.user_id,
          'clickup',
          'CLICKUP_GET_TASK',
          { task_id: id },
        )
        const obj = asRecord(task)
        const status = String(asRecord(obj.status).status ?? '') || null
        return { status, valueUsd: 0, raw: obj }
      }
      if (tool === 'asana') {
        // TODO(composio-slug): verify ASANA_GET_TASK
        const task = await executeComposioAction<Record<string, unknown>>(
          row.user_id,
          'asana',
          'ASANA_GET_TASK',
          { task_gid: id },
        )
        const obj = asRecord(task)
        const status = obj.completed === true ? 'completed' : 'open'
        return { status, valueUsd: 0, raw: obj }
      }
      return null
    }

    default:
      return null
  }
}

/**
 * Decide whether the snapshot represents the expected outcome materializing.
 * Matches are conservative — we'd rather miss a win than fabricate one.
 */
function outcomeMatches(row: PendingRow, snapshot: EntitySnapshot): boolean {
  const status = (snapshot.status ?? '').toLowerCase()
  const expected = (row.expected_outcome ?? '').toLowerCase().trim()
  const baseline = asRecord(row.baseline_state)
  const baselineStatus = String(baseline.status ?? '').toLowerCase()

  // No state change → no outcome.
  if (status && baselineStatus && status === baselineStatus) return false

  switch (row.entity_type) {
    case 'invoice': {
      // Default: any transition into "paid" counts.
      if (status === 'paid') return true
      if (expected === 'paid' && status === 'paid') return true
      return false
    }
    case 'deal': {
      if (status === 'closed-won' || status === 'won') return true
      if (expected.includes('won') && (status.includes('won'))) return true
      return false
    }
    case 'contract': {
      // Renewal: a new envelope status of "sent" or "completed" after the
      // original baseline is taken as a renewal touchpoint.
      if (status === 'completed' || status === 'sent') return true
      if (expected.includes('renewed') && status === 'completed') return true
      return false
    }
    case 'project':
    case 'task': {
      if (status === 'completed' || status === 'closed' || status === 'done') return true
      if (expected && status === expected) return true
      return false
    }
    default:
      return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Notion label mapping — `appendActionLog` expects a fixed enum.
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_LABEL_MAP: Record<string, Parameters<typeof appendActionLog>[1]['agent']> = {
  revenue: 'Revenue',
  collections: 'Collections',
  scope: 'Scope',
  delivery: 'Delivery',
  briefing: 'Briefing',
  profitability: 'Profitability',
  team: 'Team',
  growth: 'Growth',
  renewal: 'Renewal',
  stack: 'Stack',
  coo: 'COO',
}

function labelForAgent(slug: string): Parameters<typeof appendActionLog>[1]['agent'] {
  return AGENT_LABEL_MAP[slug] ?? 'COO'
}
