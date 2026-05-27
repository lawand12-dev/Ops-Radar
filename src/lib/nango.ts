/**
 * Nango client + canonical toolkit slug map.
 *
 * How identity works:
 *   - Customers live in Supabase `auth.users` (we identify them by `userId`).
 *   - Nango assigns an auto-generated `connectionId` when OAuth completes via
 *     a Connect Session — there is NO way to set the connectionId from our
 *     side at session-create time. The connectionId is opaque to us.
 *   - We tag every connect session with `tags.end_user_id = <userId>` so we
 *     can find the right connection later via `listConnections({ tags })`.
 *
 * Public API:
 *   getNango()                          — singleton client
 *   nangoProxy({ userId, tool, ... })   — make an API call as the customer
 *   hasNangoConnection(userId, tool)    — is this tool connected?
 *   resolveConnectionId(userId, tool)   — userId + tool → Nango connectionId
 *
 * Why split:
 *   The May 2026 broker breach + repeated outages made the prior broker's "tokens
 *   in their cache" model untenable. Nango stores tokens in their own
 *   infrastructure but uses short-lived Connect Session tokens so the blast
 *   radius of any future vendor incident is contained.
 *
 * Requires NANGO_SECRET_KEY (or NANGO_SECRET_KEY_DEV/_PROD) in .env.local.
 * Lazy singleton — never crashes static routes that import this transitively.
 */

import { Nango } from '@nangohq/node'
import { Redis } from '@upstash/redis'
import * as Sentry from '@sentry/nextjs'
import { checkQuota, recordUsage } from '<npm>/lib/usage/track'

/**
 * Canonical map of OpsRadar tool slugs → Nango provider config keys.
 * Keys here are what the rest of the codebase uses; values are the
 * exact integration IDs we set up in the Nango dashboard.
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
 * Resolution order:
 *   1. NANGO_SECRET_KEY                 — explicit override, always wins
 *   2. NANGO_SECRET_KEY_<NANGO-ENV>     — e.g. NANGO_SECRET_KEY_DEV / _PROD
 *      where NANGO-ENV comes from `NANGO_ENV` (defaults to 'dev').
 *   3. NANGO_SECRET_KEY_DEV — local dev fallback ONLY when NODE_ENV is
 *      not production. In production we fail fast rather than silently
 *      using the dev key (that was a real foot-gun candidate).
 *
 * Key rotation: changing the env var requires a new lambda invocation
 * since we cache the client in `_nango`. Trigger a redeploy after
 * rotating the key in Vercel.
 */
export function getNango(): Nango {
  if (_nango) return _nango

  const nangoEnv = (process.env.NANGO_ENV ?? 'dev').toUpperCase()
  const isProd = process.env.NODE_ENV === 'production'

  const candidates: Array<{ name: string; value: string | undefined }> = [
    { name: 'NANGO_SECRET_KEY', value: process.env.NANGO_SECRET_KEY },
    { name: `NANGO_SECRET_KEY_${nangoEnv}`, value: process.env[`NANGO_SECRET_KEY_${nangoEnv}`] },
  ]
  // Only fall back to the DEV key when we're not in production. Catching
  // a misconfigured prod env early is better than silently using dev creds.
  if (!isProd) {
    candidates.push({ name: 'NANGO_SECRET_KEY_DEV', value: process.env.NANGO_SECRET_KEY_DEV })
  }

  const picked = candidates.find((c) => c.value && c.value.trim().length > 0)
  if (!picked || !picked.value) {
    const tried = candidates.map((c) => c.name).join(', ')
    throw new Error(
      `Nango secret key is not set (looked for: ${tried}). ` +
        `In production set NANGO_SECRET_KEY or NANGO_SECRET_KEY_PROD; ` +
        `locally NANGO_SECRET_KEY_DEV is enough.`,
    )
  }

  _nango = new Nango({ secretKey: picked.value.trim() })
  return _nango
}

// ─── userId ↔ connectionId resolution ──────────────────────────────────────
//
// Two-tier cache:
//   L1 — in-process Map, ~5s TTL. Sub-millisecond, dedupes parallel tool
//        calls within one agent loop. Per-lambda; warm instances each have
//        their own copy.
//   L2 — Upstash Redis, ~60s TTL. Shared across every Vercel function
//        instance. Closes the cross-instance staleness window: customer
//        connects Gmail in lambda A → 1 second later lambda B's call sees
//        the connection via Redis without an extra listConnections round-
//        trip. Gracefully degrades to "L1 + Nango" if Redis is unavailable.
//   N  — Nango listConnections. Source of truth.
//
// Why both layers instead of just Redis:
//   Redis is ~5-10ms per round-trip. Inside one agent loop the model may
//   fire 10+ parallel tool calls. Hitting Redis 10× per second per agent
//   is wasteful and hits Upstash's quota fast. L1 absorbs the burst; L2
//   handles cross-instance freshness. Each layer's TTL is calibrated to
//   that role.
//
// Why we still NEVER cache nulls:
//   Same reason as before — a failed lookup means "missing connection or
//   transient error". Caching null would block the agent right after the
//   customer connects the tool.

const L1_TTL_MS = 5_000        // ~5s — hot path for parallel tool calls
const L2_TTL_S = 60            // ~60s — cross-instance freshness window

type L1Entry = { connectionId: string; expiresAt: number }
const _l1 = new Map<string, L1Entry>()

/**
 * In-flight de-dup: concurrent resolveConnectionId calls for the same
 * (userId, tool) share one network round-trip. Critical when the agent
 * fires several tool calls in parallel — without this we'd make N
 * simultaneous listConnections calls instead of 1.
 */
const _inFlight = new Map<string, Promise<string | null>>()

function cacheKey(userId: string, providerConfigKey: string): string {
  return `${userId}:${providerConfigKey}`
}

function redisKey(userId: string, providerConfigKey: string): string {
  return `nango:conn:${userId}:${providerConfigKey}`
}

/**
 * Lazy Redis client. Returns null if Upstash isn't configured — every
 * call site treats that as "skip L2, use L1 + Nango". This means
 * developers without Upstash creds get correct behavior + a bit more
 * Nango traffic; prod with creds gets the cross-instance cache.
 */
let _redis: Redis | null | undefined
function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis
  try {
    _redis = Redis.fromEnv()
  } catch {
    _redis = null
  }
  return _redis
}

/**
 * Find the Nango connection_id for a given OpsRadar user + tool.
 *
 * Resolution path:
 *   1. L1 (in-process Map, 5s TTL).
 *   2. L2 (Redis, 60s TTL). On hit, refresh L1 and return.
 *   3. In-flight de-dup for parallel callers.
 *   4. Nango listConnections (source of truth).
 *   5. On success, write back to L1 + L2 (positive only).
 */
export async function resolveConnectionId(
  userId: string,
  tool: NangoToolSlug,
): Promise<string | null> {
  const providerConfigKey = NANGO_TOOLS[tool]
  const key = cacheKey(userId, providerConfigKey)

  // 1. L1 — in-process
  const l1 = _l1.get(key)
  if (l1 && l1.expiresAt > Date.now()) {
    return l1.connectionId
  }
  if (l1) _l1.delete(key)

  // 2. L2 — Redis (cross-instance). Skipped if Upstash isn't configured.
  const redis = getRedis()
  if (redis) {
    try {
      const fromRedis = await redis.get<string>(redisKey(userId, providerConfigKey))
      if (fromRedis) {
        _l1.set(key, { connectionId: fromRedis, expiresAt: Date.now() + L1_TTL_MS })
        return fromRedis
      }
    } catch (err) {
      // Redis outage: degrade gracefully to L1 + Nango. Logged so we
      // notice if it keeps happening.
      console.warn(
        '[nango.resolveConnectionId] L2 read failed, degrading:',
        err instanceof Error ? err.message : err,
      )
    }
  }

  // 3. In-flight de-dup
  const existing = _inFlight.get(key)
  if (existing) return existing

  const probe = (async () => {
    try {
      const nango = getNango()
      const { connections } = await nango.listConnections({
        tags: { end_user_id: userId },
      } as unknown as Parameters<typeof nango.listConnections>[0])

      // Pick the first error-free connection for this toolkit. A
      // connection with `errors.length > 0` is in auth-broken state —
      // the customer needs to reconnect, and the agent should treat it
      // as "no connection" instead of trying to proxy through it.
      const match = (connections ?? []).find(
        (c: {
          provider_config_key?: string
          connection_id?: string
          errors?: Array<unknown>
        }) =>
          c.provider_config_key === providerConfigKey &&
          (c.errors ?? []).length === 0,
      )
      const id = match?.connection_id ?? null
      if (id) {
        _l1.set(key, { connectionId: id, expiresAt: Date.now() + L1_TTL_MS })
        // Fire-and-forget L2 write so a Redis blip doesn't slow the call.
        if (redis) {
          redis
            .set(redisKey(userId, providerConfigKey), id, { ex: L2_TTL_S })
            .catch((err) =>
              console.warn(
                '[nango.resolveConnectionId] L2 write failed:',
                err instanceof Error ? err.message : err,
              ),
            )
        }
      }
      return id
    } catch (err) {
      console.warn(
        `[nango.resolveConnectionId] failed for user=${userId} tool=${tool}:`,
        err instanceof Error ? err.message : err,
      )
      // Don't cache a transient error — next call should retry.
      return null
    } finally {
      _inFlight.delete(key)
    }
  })()

  _inFlight.set(key, probe)
  return probe
}

/**
 * Clear cached resolution for a user. Wipes L1 in this process AND
 * deletes from L2 so other serverless instances also see the change
 * immediately (instead of waiting up to L2_TTL_S seconds for staleness
 * to expire). Both layers are best-effort — a Redis blip doesn't block
 * the disconnect from succeeding.
 */
export function clearConnectionCache(userId: string, tool?: NangoToolSlug): void {
  const redis = getRedis()

  if (tool) {
    const providerConfigKey = NANGO_TOOLS[tool]
    _l1.delete(cacheKey(userId, providerConfigKey))
    if (redis) {
      redis.del(redisKey(userId, providerConfigKey)).catch((err) =>
        console.warn(
          '[nango.clearConnectionCache] L2 delete failed:',
          err instanceof Error ? err.message : err,
        ),
      )
    }
    return
  }

  // No specific tool — clear every entry for this user.
  for (const key of Array.from(_l1.keys())) {
    if (key.startsWith(`${userId}:`)) _l1.delete(key)
  }
  if (redis) {
    // Best-effort wipe of every L2 entry for this user.
    Promise.all(
      Object.keys(NANGO_TOOLS).map((toolSlug) =>
        redis.del(redisKey(userId, NANGO_TOOLS[toolSlug as NangoToolSlug])),
      ),
    ).catch((err) =>
      console.warn(
        '[nango.clearConnectionCache] L2 bulk delete failed:',
        err instanceof Error ? err.message : err,
      ),
    )
  }
}

// ─── Proxy + status helpers ────────────────────────────────────────────────

/**
 * One authenticated API call against a customer's connected tool, brokered
 * through Nango's proxy. Returns the raw upstream response body.
 *
 * Nango handles: OAuth token retrieval, token refresh, rate-limit backoff,
 * retries. We pass `endpoint` (the upstream API path) and Nango injects
 * credentials before the request leaves their proxy.
 *
 * Throws if the customer doesn't have a connection for this tool yet —
 * callers should check `hasNangoConnection()` first, or catch the error
 * and surface it as "connect this tool" in UI.
 */
export async function nangoProxy<T = unknown>(opts: {
  userId: string
  tool: NangoToolSlug
  endpoint: string
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  params?: Record<string, string | number | string[] | number[]>
  data?: unknown
  /** Extra upstream headers (e.g. Notion-Version). Merged into the proxy request. */
  headers?: Record<string, string>
}): Promise<T> {
  const nango = getNango()
  const providerConfigKey = NANGO_TOOLS[opts.tool]
  const method = opts.method ?? 'GET'

  // Pre-flight quota check — fail fast if the customer is over their
  // monthly nango-executions cap. We surface a structured error the agent
  // loop catches and reports as "queued for next month" instead of an
  // opaque 503. Fails open (allows the call) if the quota check itself
  // errors — better to over-allow than to silently block a paying customer.
  const quota = await checkQuota({ userId: opts.userId, provider: 'nango' })
  if (!quota.allowed) {
    throw new Error(
      `Monthly Nango cap reached (${quota.used.toLocaleString()}/${quota.cap.toLocaleString()} executions). ` +
      `Resets ${quota.resetsAt.toISOString().slice(0, 10)}. Ask the customer to upgrade their tier or wait.`,
    )
  }

  const connectionId = await resolveConnectionId(opts.userId, opts.tool)
  if (!connectionId) {
    throw new Error(
      `Customer ${opts.userId} has no Nango connection for ${opts.tool}. ` +
      `Ask them to connect it at /dashboard/integrations.`,
    )
  }

  const request = {
    endpoint: opts.endpoint,
    providerConfigKey,
    connectionId,
    params: opts.params,
    data: opts.data,
    ...(opts.headers ? { headers: opts.headers } : {}),
  }

  // Track usage in the background — fire-and-forget so a logging blip
  // never breaks the agent run. Each nangoProxy call counts as one
  // execution against the per-tier monthly cap.
  const trackUsage = (operation: 'tool_execute' | 'tool_fetch') => {
    void recordUsage({
      userId: opts.userId,
      provider: 'nango',
      operation,
      credits: 1,
      metadata: { tool: opts.tool, endpoint: opts.endpoint, method },
    }).catch(() => {})
  }

  try {
    switch (method) {
      case 'GET': {
        const res = await nango.get(request)
        trackUsage('tool_fetch')
        return res.data as T
      }
      case 'POST': {
        const res = await nango.post(request)
        trackUsage('tool_execute')
        return res.data as T
      }
      case 'PATCH': {
        const res = await nango.patch(request)
        trackUsage('tool_execute')
        return res.data as T
      }
      case 'PUT': {
        const res = await nango.put(request)
        trackUsage('tool_execute')
        return res.data as T
      }
      case 'DELETE': {
        const res = await nango.delete(request)
        trackUsage('tool_execute')
        return res.data as T
      }
    }
  } catch (err) {
    // If Nango's response indicates an auth-broken connection (401, 403,
    // or a 404 on the connection itself), invalidate our cache so the
    // next call re-probes and treats this as "no connection" — which
    // surfaces to the agent as a friendly "ask the customer to reconnect"
    // message instead of repeated 401 retries.
    const status = extractHttpStatus(err)
    if (status === 401 || status === 403 || status === 404) {
      clearConnectionCache(opts.userId, opts.tool)
      console.warn(
        `[nangoProxy] ${opts.tool} returned ${status} — cleared connectionId cache; customer likely needs to reconnect.`,
      )
    }

    // Capture in Sentry with the toolkit + endpoint + status so we can
    // grep "which integration is misbehaving in production today?" Auth
    // errors (401/403/404) get tagged so we can filter "customer needs
    // reconnect" from real infrastructure failures.
    const isAuthError = status === 401 || status === 403 || status === 404
    Sentry.captureException(err, {
      level: isAuthError ? 'warning' : 'error',
      tags: {
        nango_tool: opts.tool,
        nango_method: method,
        http_status: status ? String(status) : 'unknown',
        is_auth_error: String(isAuthError),
      },
      contexts: {
        nango: {
          user_id: opts.userId,
          endpoint: opts.endpoint,
          connection_id: connectionId,
        },
      },
    })

    throw err
  }
}

/**
 * Best-effort extraction of an HTTP status code from a thrown error.
 * Nango's SDK wraps axios errors, but we don't want a hard dependency
 * on the axios error shape — duck-type instead.
 */
function extractHttpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined
  const e = err as { response?: { status?: number }; status?: number; statusCode?: number }
  return e.response?.status ?? e.status ?? e.statusCode
}

/**
 * Checks whether the customer has an active Nango connection for the given
 * tool. Use before calling `nangoProxy` to avoid 404s in agent prompts.
 */
export async function hasNangoConnection(
  userId: string,
  tool: NangoToolSlug,
): Promise<boolean> {
  const id = await resolveConnectionId(userId, tool)
  return id !== null
}
