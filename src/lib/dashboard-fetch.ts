import { Redis } from '@upstash/redis';

let redisInstance: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisInstance !== undefined) return redisInstance;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisInstance = null;
    return null;
  }
  try {
    redisInstance = new Redis({ url, token });
    return redisInstance;
  } catch (err) {
    console.warn('[dashboard-fetch] Redis init failed, caching disabled:', err);
    redisInstance = null;
    return null;
  }
}

async function safeRedisGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return (await redis.get<T>(key)) ?? null;
  } catch (err) {
    console.warn('[dashboard-fetch] redis.get failed:', err);
    return null;
  }
}

async function safeRedisSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.warn('[dashboard-fetch] redis.set failed:', err);
  }
}

const CACHE_TTL_SECONDS = 180;
const STALE_TTL_SECONDS = 60 * 60 * 24; // 24h backup for stale-while-error

export type WidgetFetchOptions = {
  widget: string;
  clientId: string;
  n8nWorkflow: string;
  payload: Record<string, unknown>;
  fresh?: boolean;
  n8nBaseUrl?: string;
  n8nWebhookSecret?: string;
};

export type WidgetFetchResult<T> =
  | { status: 'ok'; data: T; fromCache: boolean }
  | { status: 'error'; message: string; staleData?: T; staleAgeMs?: number };

export async function fetchDashboardWidget<T>(
  opts: WidgetFetchOptions
): Promise<WidgetFetchResult<T>> {
  const cacheKey = `dash:${opts.widget}:${opts.clientId}`;
  const staleKey = `${cacheKey}:stale`;

  // 1. Try cache (unless fresh forced). If Redis is unavailable, treat as miss.
  if (!opts.fresh) {
    const cached = await safeRedisGet<{ data: T; ts: number }>(cacheKey);
    if (cached) {
      return { status: 'ok', data: cached.data, fromCache: true };
    }
  }

  // 2. Call n8n
  const baseUrl = opts.n8nBaseUrl ?? process.env.N8N_BASE_URL;
  const secret = opts.n8nWebhookSecret ?? process.env.N8N_WEBHOOK_SECRET;
  if (!baseUrl || !secret || baseUrl === '__SET_BEFORE_USE__') {
    return { status: 'error', message: 'n8n is not configured (missing env vars)' };
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/webhook/${opts.n8nWorkflow}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-opsradar-secret': secret,
      },
      body: JSON.stringify(opts.payload),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    const stale = await safeRedisGet<{ data: T; ts: number }>(staleKey);
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'n8n call failed',
      ...(stale && { staleData: stale.data, staleAgeMs: Date.now() - stale.ts }),
    };
  }

  if (!response.ok) {
    const stale = await safeRedisGet<{ data: T; ts: number }>(staleKey);
    return {
      status: 'error',
      message: `n8n returned ${response.status}`,
      ...(stale && { staleData: stale.data, staleAgeMs: Date.now() - stale.ts }),
    };
  }

  const data = (await response.json()) as T;

  // 3. Write cache (fresh + long-lived stale backup). Best-effort — a cache
  // write failure must not break a successful n8n response.
  const wrapped = { data, ts: Date.now() };
  await Promise.all([
    safeRedisSet(cacheKey, wrapped, CACHE_TTL_SECONDS),
    safeRedisSet(staleKey, wrapped, STALE_TTL_SECONDS),
  ]);

  return { status: 'ok', data, fromCache: false };
}
