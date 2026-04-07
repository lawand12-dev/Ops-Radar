const ONE_HOUR_MS = 60 * 60 * 1000

interface RateLimitEntry {
  count: number
  resetAt: number
}

type RateLimitName =
  | 'admin-auth'
  | 'audit-step'
  | 'build-request'
  | 'chat'
  | 'chat-history'
  | 'funnel-event'
  | 'generate-audit'
  | 'notify'
  | 'notify-chat-lead'
  | 'send-unlock-email'

const rateLimiter = new Map<string, RateLimitEntry>()

const RATE_LIMITS: Record<RateLimitName, { limit: number; windowMs: number }> = {
  'admin-auth': { limit: 10, windowMs: ONE_HOUR_MS },
  'audit-step': { limit: 120, windowMs: ONE_HOUR_MS },
  'build-request': { limit: 10, windowMs: ONE_HOUR_MS },
  chat: { limit: 20, windowMs: ONE_HOUR_MS },
  'chat-history': { limit: 10, windowMs: ONE_HOUR_MS },
  'funnel-event': { limit: 240, windowMs: ONE_HOUR_MS },
  'generate-audit': { limit: 3, windowMs: ONE_HOUR_MS },
  notify: { limit: 5, windowMs: ONE_HOUR_MS },
  'notify-chat-lead': { limit: 10, windowMs: ONE_HOUR_MS },
  'send-unlock-email': { limit: 10, windowMs: ONE_HOUR_MS },
}

function pruneExpiredEntries(now: number) {
  for (const [key, entry] of rateLimiter.entries()) {
    if (entry.resetAt <= now) {
      rateLimiter.delete(key)
    }
  }
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

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  pruneExpiredEntries(now)

  const entry = rateLimiter.get(key)
  if (!entry || entry.resetAt <= now) {
    rateLimiter.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) {
    return false
  }

  entry.count += 1
  rateLimiter.set(key, entry)
  return true
}

export function applyRateLimit(request: Request, routeName: RateLimitName): Response | null {
  const config = RATE_LIMITS[routeName]
  const ip = getClientIp(request)
  const allowed = checkRateLimit(`${routeName}:${ip}`, config.limit, config.windowMs)

  if (allowed) {
    return null
  }

  return Response.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429 },
  )
}
