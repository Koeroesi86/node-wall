import { expect, test } from 'vitest';
import createRateLimiter from './createRateLimiter';

test('allows up to the limit and then blocks', () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });

  expect(limiter.consume('a', 0)).toBe(true);
  expect(limiter.consume('a', 1)).toBe(true);
  expect(limiter.consume('a', 2)).toBe(false);
});

test('tracks keys independently', () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });

  expect(limiter.consume('a', 0)).toBe(true);
  expect(limiter.consume('b', 0)).toBe(true);
  expect(limiter.consume('a', 1)).toBe(false);
});

test('allows again after the window passes', () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });

  limiter.consume('a', 0);
  expect(limiter.consume('a', 999)).toBe(false);
  expect(limiter.consume('a', 1000)).toBe(true);
});
