/**
 * Nango client + canonical toolkit slug map (CP-45 migration spike).
 *
 * Parallel primitive to `src/lib/composio.ts` — same shape, same singleton
 * pattern, same toolkit key set. Call-site migration is mechanical: swap
 * `getComposio()` → `getNango()` and `getComposioToolsForUser()` → the Nango
 * equivalent below.
 *
 * Why split: the May 2026 Composio breach + repeated outages made
 * Composio's "tokens in their cache" model untenable. Nango stores tokens in
 * OUR db (via their managed proxy), so the blast radius of any future
 * vendor incident is contained.
 *
 * Requires NANGO_SECRET_KEY in .env.local. Lazy singleton — never crashes
 * static routes that import this transitively.
 *
 * See: docs/positioning/inversions.md? No — see the migration memory
 * `project-composio-to-nango-migration` for the decision rationale.
 */

import { Nango } from '@nangohq/node'

/**
 * Canonical map of OpsRadar tool slugs → Nango provider config keys.
 *
 * Nango calls these "providerConfigKey" — they're the IDs you set in the
 * Nango dashboard when you configure each integration. We default to the
 * lowercase tool name; override per-row if your dashboard uses a different
 * naming convention.
 *
 * Keep this list 1:1 with `COMPOSIO_TOOLS` in `composio.ts` so the
 * `composio_connections.tool_slug` column keeps working unchanged through
 * the migration window.
 */
export const NANGO_TOOLS = {
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
  toggl: 'toggl-track',
  // Comms & calendar
  gmail: 'google-mail',
  slack: 'slack',
  google_calendar: 'google-calendar',
  calendly: 'calendly',
  // Marketing
  google_analytics: 'google-analytics',
  google_ads: 'google-ads',
  linkedin: 'linkedin',
  // HR & payroll
  bamboo_hr: 'bamboohr',
  gusto: 'gusto',
  // Contracts & forms
  typeform: 'typeform',
  // Support
  intercom: 'intercom',
  zendesk: 'zendesk',
  // Brain
  notion: 'notion',
} as const

export type NangoToolSlug = keyof typeof NANGO_TOOLS
export type NangoProviderConfigKey = (typeof NANGO_TOOLS)[NangoToolSlug]

let _nango: Nango | null = null

/**
 * Lazy singleton. Throws if no Nango secret key is set.
 *
 * Nango uses per-environment env var names (their CLI convention). We resolve
 * in this priority order:
 *   1. NANGO_SECRET_KEY                 — generic, overrides everything
 *   2. NANGO_SECRET_KEY_<ENV-UPPERCASE> — e.g. NANGO_SECRET_KEY_DEV / _PROD
 *   3. NANGO_SECRET_KEY_DEV             — fallback for local dev when NANGO_ENV unset
 *
 * Set NANGO_ENV=prod (or whatever your prod env is named in Nango's dashboard)
 * when deploying. Locally, NANGO_SECRET_KEY_DEV is enough.
 */
export function getNango(): Nango {
  if (_nango) return _nango

  const env = (process.env.NANGO_ENV ?? 'dev').toUpperCase()
  const secretKey = (
    process.env.NANGO_SECRET_KEY ??
    process.env[`NANGO_SECRET_KEY_${env}`] ??
    process.env.NANGO_SECRET_KEY_DEV ??
    ''
  ).trim()

  if (!secretKey) {
    throw new Error(
      `Nango secret key is not set — looked for NANGO_SECRET_KEY, NANGO_SECRET_KEY_${env}, NANGO_SECRET_KEY_DEV`,
    )
  }

  _nango = new Nango({ secretKey })
  return _nango
}

/**
 * One authenticated API call against a customer's connected tool, brokered
 * through Nango's proxy. Returns the raw upstream response body.
 *
 * Nango handles: OAuth token retrieval, token refresh, rate-limit backoff,
 * retries. We pass `endpoint` (the upstream API path) and Nango injects
 * credentials before the request leaves their proxy.
 *
 * @param userId      — OpsRadar auth.users.id; used as Nango's `connectionId`
 * @param tool        — OpsRadar tool slug (e.g. 'hubspot')
 * @param endpoint    — Upstream API path (e.g. '/crm/v3/objects/deals')
 * @param method      — HTTP method (default 'GET')
 * @param params      — Query string params
 * @param data        — Request body (for POST/PATCH/PUT)
 */
export async function nangoProxy<T = unknown>(opts: {
  userId: string
  tool: NangoToolSlug
  endpoint: string
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  params?: Record<string, string | number | string[] | number[]>
  data?: unknown
}): Promise<T> {
  const nango = getNango()
  const providerConfigKey = NANGO_TOOLS[opts.tool]
  const method = opts.method ?? 'GET'

  const request = {
    endpoint: opts.endpoint,
    providerConfigKey,
    connectionId: opts.userId,
    params: opts.params,
    data: opts.data,
  }

  switch (method) {
    case 'GET': {
      const res = await nango.get(request)
      return res.data as T
    }
    case 'POST': {
      const res = await nango.post(request)
      return res.data as T
    }
    case 'PATCH': {
      const res = await nango.patch(request)
      return res.data as T
    }
    case 'PUT': {
      const res = await nango.put(request)
      return res.data as T
    }
    case 'DELETE': {
      const res = await nango.delete(request)
      return res.data as T
    }
  }
}

/**
 * Checks whether the customer has an active Nango connection for the given
 * tool. Use before calling `nangoProxy` to avoid 404s in agent prompts.
 */
export async function hasNangoConnection(
  userId: string,
  tool: NangoToolSlug,
): Promise<boolean> {
  const nango = getNango()
  const providerConfigKey = NANGO_TOOLS[tool]
  try {
    const connection = await nango.getConnection(providerConfigKey, userId)
    return Boolean(connection)
  } catch {
    return false
  }
}
