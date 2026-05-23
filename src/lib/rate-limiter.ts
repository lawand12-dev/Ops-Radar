import type Redis from "ioredis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Sliding-window rate limiter using a Redis sorted set.
 * Key pattern: rate:<scope>:<userId>
 */
export async function checkRateLimit(
  redis: Redis,
  opts: {
    scope: string;
    userId: string;
    maxRequests: number;
    windowMs: number;
  }
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - opts.windowMs;
  const key = `rate:${opts.scope}:${opts.userId}`;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, "-inf", windowStart);
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  pipeline.zcard(key);
  pipeline.pexpire(key, opts.windowMs);
  const results = await pipeline.exec();

  const count = (results?.[2]?.[1] as number) ?? 0;
  return {
    allowed: count <= opts.maxRequests,
    remaining: Math.max(0, opts.maxRequests - count)
  };
}
