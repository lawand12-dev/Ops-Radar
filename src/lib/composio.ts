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
