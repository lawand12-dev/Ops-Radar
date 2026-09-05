import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type RateLimitName =
  | 'admin-auth'
  | 'admin-data'
  | 'auth-signin'
  | 'auth-forgot-password'
  | 'dashboard-coo'
  | 'dashboard-hire'
  | 'dashboard-employee-chat'
  | 'integrations-connect'
  | 'share'
  | 'dashboard-actions'
  | 'dashboard-benchmarks'
  | 'dashboard-health-report'
  | 'dashboard-score'
  | 'diorization-upload'

const RATE_LIMITS: Record<RateLimitName, { limit: number; window: '1 h' }> = {
  'admin-auth': { limit: 10, window: '1 h' },
  'admin-data': { limit: 30, window: '1 h' },
  'auth-signin': { limit: 20, window: '1 h' },
  'auth-forgot-password': { limit: 5, window: '1 h' },
  'dashboard-coo': { limit: 30, window: '1 h' },
  'dashboard-hire': { limit: 30, window: '1 h' },
  'dashboard-employee-chat': { limit: 60, window: '1 h' },
  'integrations-connect': { limit: 10, window: '1 h' },
  share: { limit: 60, window: '1 h' },
  'dashboard-actions': { limit: 120, window: '1 h' },
  'dashboard-benchmarks': { limit: 120, window: '1 h' },
  'dashboard-health-report': { limit: 20, window: '1 h' },
  'dashboard-score': { limit: 30, window: '1 h' },
  'diorization-upload': { limit: 5, window: '1 h' },
}

/**
 * Routes that MUST NOT be allowed through if the rate limiter is unavailable.
 * Rationale: these routes trigger real spend (OpenAI, Resend, Supabase writes)
 * or gate admin access. A single Upstash outage should never become an
 * unbounded liability window.
 *
 * Fail-open routes (audit-result, audit-step, funnel-event, admin-data) are
 * either read-only, analytics, or already protected by another layer (admin
 * session). Losing their rate limits during an Upstash incident is a smaller
 * cost than breaking the product for legitimate users.
 */
const FAIL_CLOSED_ROUTES = new Set<RateLimitName>([
  'admin-auth',
  'auth-signin',
  'auth-forgot-password',
  'dashboard-coo',
  'dashboard-hire',
  'dashboard-employee-chat',
  'integrations-connect',
  'dashboard-health-report',
])

function createLimiters() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  return Object.fromEntries(
    Object.entries(RATE_LIMITS).map(([name, config]) => [
      name,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.limit, config.window),
        prefix: `ratelimit:${name}`,
      }),
    ]),
  ) as Record<RateLimitName, Ratelimit>
}

let limiters: Record<RateLimitName, Ratelimit> | null | undefined

function getLimiters() {
  if (limiters === undefined) {
    limiters = createLimiters()
  }
  return limiters
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'anonymous'
  }

  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('fly-client-ip') ||
    'anonymous'
  )
}

function serviceUnavailableResponse() {
  return Response.json(
    { error: 'Service temporarily unavailable. Please try again in a moment.' },
    { status: 503, headers: { 'Retry-After': '30' } },
  )
}

function tooManyRequestsResponse(remaining: number, reset: number) {
  return Response.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(reset),
      },
    },
  )
}

export async function applyRateLimit(
  request: Request,
  routeName: RateLimitName,
  identifier?: string,
): Promise<Response | null> {
  const instances = getLimiters()
  const isFailClosed = FAIL_CLOSED_ROUTES.has(routeName)
  const isProd = process.env.NODE_ENV === 'production'

  // 1. Upstash not configured at all.
  if (!instances) {
    if (isFailClosed && isProd) {
      // In production, a missing rate limiter on a fail-closed route is a
      // deployment error, not an acceptable state. Reject immediately.
      console.error(
        `[rate-limit] FAIL-CLOSED: Upstash not configured for route "${routeName}" in production`,
      )
      return serviceUnavailableResponse()
    }
    // Dev / non-critical route — allow through but make the gap visible.
    console.warn(`[rate-limit] Upstash not configured — allowing "${routeName}"`)
    return null
  }

  // 2. Upstash configured — call it.
  try {
    const key = identifier ?? getClientIp(request)
    const { success, remaining, reset } = await instances[routeName].limit(key)

    if (success) {
      return null
    }

    return tooManyRequestsResponse(remaining, reset)
  } catch (err) {
    // 3. Upstash transient failure.
    console.error(`[rate-limit] Redis error on "${routeName}":`, err)

    if (isFailClosed) {
      // Protect the expensive/sensitive path rather than let it run uncapped.
      return serviceUnavailableResponse()
    }

    // Non-critical route — prefer availability over strict rate limiting.
    return null
  }
}
