import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { startPurgeScheduler } from './start-purge-scheduler';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('runs after the first delay and then every interval', () => {
  const purge = vi.fn(async () => undefined);
  startPurgeScheduler(purge, 1000, 100);

  vi.advanceTimersByTime(99);
  expect(purge).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(purge).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(1000);
  expect(purge).toHaveBeenCalledTimes(2);
});

test('stop cancels further runs', () => {
  const purge = vi.fn(async () => undefined);
  startPurgeScheduler(purge, 1000, 100)();

  vi.advanceTimersByTime(5000);
  expect(purge).not.toHaveBeenCalled();
});
