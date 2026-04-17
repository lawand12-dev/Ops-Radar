import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ONE_HOUR_MS = 60 * 60 * 1000

type RateLimitName =
  | 'admin-auth'
  | 'admin-data'
  | 'audit-result'
  | 'audit-step'
  | 'build-request'
  | 'chat'
  | 'chat-conversations'
  | 'funnel-event'
  | 'generate-audit'
  | 'notify'
  | 'notify-chat-lead'
  | 'quick-win-onboarding'
  | 'research-preview'
  | 'send-unlock-email'

const RATE_LIMITS: Record<RateLimitName, { limit: number; window: '1 h' }> = {
  'admin-auth': { limit: 10, window: '1 h' },
  'admin-data': { limit: 30, window: '1 h' },
  'audit-result': { limit: 120, window: '1 h' },
  'audit-step': { limit: 120, window: '1 h' },
  'build-request': { limit: 10, window: '1 h' },
  chat: { limit: 20, window: '1 h' },
  'chat-conversations': { limit: 120, window: '1 h' },
  'funnel-event': { limit: 240, window: '1 h' },
  'generate-audit': { limit: 3, window: '1 h' },
  notify: { limit: 5, window: '1 h' },
  'notify-chat-lead': { limit: 10, window: '1 h' },
  'quick-win-onboarding': { limit: 10, window: '1 h' },
  'research-preview': { limit: 20, window: '1 h' },
  'send-unlock-email': { limit: 10, window: '1 h' },
}

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

export async function applyRateLimit(
  request: Request,
  routeName: RateLimitName,
): Promise<Response | null> {
  const instances = getLimiters()

  if (!instances) {
    console.warn('[rate-limit] Upstash not configured — allowing request')
    return null
  }

  try {
    const ip = getClientIp(request)
    const { success, remaining, reset } = await instances[routeName].limit(ip)

    if (success) {
      return null
    }

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
  } catch (err) {
    console.error('[rate-limit] Redis error — allowing request:', err)
    return null
  }
}
