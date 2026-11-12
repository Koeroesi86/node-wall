interface RateLimiterOptions {
  limit: number;
  windowMs: number;
}

/** Fixed-window in-memory limiter. `consume` returns false once `key` exceeded `limit` within the window. */
export default ({ limit, windowMs }: RateLimiterOptions) => {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    consume(key: string, now = Date.now()): boolean {
      hits.forEach((hit, hitKey) => hit.resetAt <= now && hits.delete(hitKey));

      const current = hits.get(key) ?? { count: 0, resetAt: now + windowMs };
      current.count += 1;
      hits.set(key, current);

      return current.count <= limit;
    },
  };
};
