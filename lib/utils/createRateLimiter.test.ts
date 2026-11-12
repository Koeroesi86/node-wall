import { beforeEach, expect, test, vi } from 'vitest';
import rateLimitService from '../services/rate-limit';
import createRateLimiter from './createRateLimiter';

vi.mock('../services/rate-limit');

beforeEach(() => vi.resetAllMocks());

test('allows hits up to the limit and then blocks', async () => {
  const limiter = createRateLimiter({ name: 'login', limit: 2, windowMs: 1000 });

  vi.mocked(rateLimitService.hit).mockResolvedValueOnce(2).mockResolvedValueOnce(3);

  expect(await limiter.consume('a')).toBe(true);
  expect(await limiter.consume('a')).toBe(false);
});

test('namespaces keys by limiter name and passes the window', async () => {
  vi.mocked(rateLimitService.hit).mockResolvedValue(1);
  await createRateLimiter({ name: 'login', limit: 1, windowMs: 1000 }).consume('a');

  expect(rateLimitService.hit).toHaveBeenCalledWith('login:a', 1000);
});
