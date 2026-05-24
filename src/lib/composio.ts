/**
 * Composio client + canonical toolkit slug map.
 *
 * Stack: `@composio/core` + `@composio/vercel` (VercelProvider) — pairs with the Vercel
 * AI SDK's `generateText` / `streamText` so agents can use multi-step tool calling
 * without hand-rolling the OpenAI tool-call loop.
 *
 * Requires COMPOSIO_API_KEY in .env.local. The client is created lazily so importing
 * this module never crashes pages that don't actually call Composio (marketing,
 * static-rendered routes, etc.).
 */

import { Composio } from '@composio/core'
import { VercelProvider } from '@composio/vercel'

/**
 * Canonical map of OpsRadar tool slugs → Composio toolkit slugs.
 * Keys: snake_case identifiers used inside our code + persisted in
 * `composio_connections.tool_slug`. Values: the lowercase slug Composio expects.
 */
export const COMPOSIO_TOOLS = {
  // Finance & accounting
  stripe: 'stripe',
  quickbooks: 'quickbooks',
  xero: 'xero',
  // Sales & CRM
  hubspot: 'hubspot',
  pipedrive: 'pipedrive',
  apollo: 'apollo',
  // Project management
  clickup: 'clickup',
  asana: 'asana',
  monday: 'monday',
  // Time tracking
  harvest: 'harvest',
  toggl: 'toggl',
  // Comms & calendar
  gmail: 'gmail',
  slack: 'slack',
  google_calendar: 'googlecalendar',
  calendly: 'calendly',
  // Marketing
  google_analytics: 'googleanalytics',
  google_ads: 'googleads',
  facebook_ads: 'facebookads',
  linkedin: 'linkedin',
  // HR & payroll
  bamboo_hr: 'bamboohr',
  gusto: 'gusto',
  // Contracts & forms
  docusign: 'docusign',
  typeform: 'typeform',
  // Support
  intercom: 'intercom',
  zendesk: 'zendesk',
  // Brain
  notion: 'notion',
} as const

export type ToolSlug = keyof typeof COMPOSIO_TOOLS
export type ComposioToolkitSlug = (typeof COMPOSIO_TOOLS)[ToolSlug]

let _composio: Composio<VercelProvider> | null = null

/**
 * Lazy singleton. Throws if COMPOSIO_API_KEY is missing — callers should treat
 * that as a config error and surface it, not silently no-op.
 */
export function getComposio(): Composio<VercelProvider> {
  if (_composio) return _composio

  const apiKey = (process.env.COMPOSIO_API_KEY ?? '').trim()
  if (!apiKey) {
    throw new Error('COMPOSIO_API_KEY is not set — Composio integrations disabled')
  }

  _composio = new Composio({
    apiKey,
    provider: new VercelProvider(),
  })
  return _composio
}

/**
 * Returns Vercel-AI-SDK-shaped `tools` object for the given user across the given
 * toolkits. Pass the result straight into `generateText({ tools })` or `streamText`.
 *
 * `userId` is the Composio "external user id" — we use the OpsRadar auth.users.id.
 */
export async function getComposioToolsForUser(
  userId: string,
  toolkits: ComposioToolkitSlug[],
): Promise<Awaited<ReturnType<Composio<VercelProvider>['tools']['get']>>> {
  const composio = getComposio()
  return composio.tools.get(userId, { toolkits })
}

/**
 * Looks up which toolkits the given user has actively connected via Composio
 * OAuth. Returns the OpsRadar ToolSlug values (snake_case), most-recently-
 * connected first. Used by the COO chat to load only relevant Composio tools
 * (capped at N) instead of every tool in every connected toolkit.
 */
export async function getConnectedToolSlugs(userId: string): Promise<ToolSlug[]> {
  // Defer import to avoid pulling Supabase into pages that only need the
  // tool-slug constants.
  const { getServerSupabaseClient } = await import('<npm>/lib/supabase-server')
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('composio_connections')
    .select('tool_slug, last_used_at, connected_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .order('connected_at', { ascending: false })

  if (error || !data) return []

  const valid = new Set(Object.keys(COMPOSIO_TOOLS) as ToolSlug[])
  const out: ToolSlug[] = []
  for (const row of data) {
    if (valid.has(row.tool_slug as ToolSlug)) out.push(row.tool_slug as ToolSlug)
  }
  return out
}

/**
 * Resolves a tool slug → Composio Auth Config ID via env vars.
 *
 * Composio requires an `authConfigId` (e.g. 'ac_xxx'), not a toolkit slug.
 * Auth Configs are created once per toolkit in the Composio dashboard and hold
 * the OAuth app credentials. Used by `connectedAccounts.link()`.
 *
 * Convention: COMPOSIO_AUTH_CONFIG_<TOOL> where TOOL is the uppercased ToolSlug.
 * Examples: COMPOSIO_AUTH_CONFIG_GMAIL, COMPOSIO_AUTH_CONFIG_HUBSPOT.
 *
 * Returns null if the env var is missing — callers should surface this as
 * "this toolkit isn't set up yet" to the customer.
 */
export function getAuthConfigId(toolSlug: ToolSlug): string | null {
  const envName = `COMPOSIO_AUTH_CONFIG_${toolSlug.toUpperCase()}`
  const value = (process.env[envName] ?? '').trim()
  return value || null
}
