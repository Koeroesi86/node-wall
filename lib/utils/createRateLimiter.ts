import rateLimitService from '../services/rate-limit';

interface RateLimiterOptions {
  name: string;
  limit: number;
  windowMs: number;
}

/** Fixed-window limiter persisted in sqlite, so counters survive worker restarts. `consume` resolves false once `key` exceeded `limit` within the window. */
export default ({ name, limit, windowMs }: RateLimiterOptions) => ({
  async consume(key: string): Promise<boolean> {
    const count = await rateLimitService.hit(`${name}:${key}`, windowMs);

    return count <= limit;
  },
});
