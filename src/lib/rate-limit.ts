interface RateLimitEntry {
  count: number;
  timestamp: number;
}

const rateLimiter = new Map<string, RateLimitEntry>();

export const checkRateLimit = (
  key: string,
  limit: number,
  windowMs: number
): boolean => {
  const now = Date.now();
  const entry = rateLimiter.get(key);

  if (entry && now - entry.timestamp < windowMs) {
    if (entry.count >= limit) {
      return false; // Rate limit exceeded
    } else {
      entry.count++;
    }
  } else {
    rateLimiter.set(key, { count: 1, timestamp: now });
  }

  return true;
};