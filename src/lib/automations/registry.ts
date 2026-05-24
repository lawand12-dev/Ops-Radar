/**
 * Automations registry — the runtime catalog every agent reads.
 *
 * Mirrors the Anthropic Agent Skills loader (`src/lib/skills.ts`) for the
 * three-tier progressive-disclosure pattern, but reads from Supabase instead
 * of git-tracked files because automations are runtime-mutable.
 *
 *   Tier 1 — Boot:     `loadAutomationCatalog(userId)` returns the
 *                      `[name, description]` rows for all active automations.
 *                      `buildAutomationsSystemBlock(catalog)` injects them
 *                      into every agent's system prompt (cron + COO + tool).
 *   Tier 2 — On demand: agents call the `list_automations` tool to filter
 *                      and `inspect_automation` to read a full spec.
 *   Tier 3 — Live:     `findAutomationsForEvent({ user_id, toolkit, slug })`
 *                      answers "does any automation fire on this event?" —
 *                      used by the webhook handler and by cron agents that
 *                      want to skip work already covered by an automation.
 */

import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import type { CustomerAutomation } from './types'

export type AutomationCatalogEntry = {
  id: string
  slug: string
  name: string
  description: string
  trigger_kind: string
  trigger_toolkit: string | null
  trigger_slug: string | null
  autonomy: string
}

/** Returns the lightweight catalog of all ACTIVE automations for a user. */
export async function loadAutomationCatalog(
  userId: string,
): Promise<AutomationCatalogEntry[]> {
  try {
    const supabase = getServerSupabaseClient()
    const { data, error } = await supabase
      .from('customer_automations')
      .select(
        'id, slug, name, description, trigger_kind, trigger_toolkit, trigger_slug, autonomy',
      )
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[automations/registry] catalog load failed:', error.message)
      return []
    }
    return (data ?? []) as AutomationCatalogEntry[]
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[automations/registry] catalog load threw:', message)
    return []
  }
}

/** Returns full automations (with spec) for a user — used by the dashboard UI. */
export async function listAutomations(
  userId: string,
): Promise<CustomerAutomation[]> {
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('customer_automations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[automations/registry] list failed:', error.message)
    return []
  }
  return (data ?? []) as unknown as CustomerAutomation[]
}

export async function inspectAutomation(
  userId: string,
  id: string,
): Promise<CustomerAutomation | null> {
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('customer_automations')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as unknown as CustomerAutomation
}

export type FindEventInput = {
  userId: string
  toolkit: string
  triggerSlug: string
}

/**
 * Returns every ACTIVE automation that fires on this (toolkit, trigger_slug)
 * for this user. Filter evaluation (trigger_filter JSON) is the caller's job.
 *
 * This is the duplicate-prevention call cron agents make before proposing
 * an action ("don't draft a reminder if an automation already handles it").
 */
export async function findAutomationsForEvent(
  input: FindEventInput,
): Promise<CustomerAutomation[]> {
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('customer_automations')
    .select('*')
    .eq('user_id', input.userId)
    .eq('status', 'active')
    .eq('trigger_kind', 'composio_event')
    .eq('trigger_toolkit', input.toolkit)
    .eq('trigger_slug', input.triggerSlug)
  if (error) {
    console.warn('[automations/registry] find-for-event failed:', error.message)
    return []
  }
  return (data ?? []) as unknown as CustomerAutomation[]
}

/**
 * Builds the system-prompt block that goes into every agent's prompt.
 * Format: `- <name>: <description>` per line. Designed to be small + cacheable.
 *
 * Returns an empty string when no automations exist so the prompt is unchanged.
 */
export function buildAutomationsSystemBlock(
  catalog: AutomationCatalogEntry[],
): string {
  if (catalog.length === 0) return ''
  const lines = catalog.map((a) => {
    const trigger =
      a.trigger_kind === 'composio_event' && a.trigger_toolkit && a.trigger_slug
        ? `${a.trigger_toolkit}/${a.trigger_slug}`
        : a.trigger_kind
    return `- ${a.slug} [${trigger}] [${a.autonomy}]: ${a.description}`
  })
  return [
    "Customer-built automations currently active (don't propose duplicates — call the `find_automation_for_trigger` or `list_automations` tools to inspect):",
    '',
    ...lines,
  ].join('\n')
}
