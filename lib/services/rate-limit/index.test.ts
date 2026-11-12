import { beforeEach, expect, test, vi } from 'vitest';
import hit from './queries/hit';
import removeExpired from './queries/removeExpired';
import rateLimitService from './index';

vi.mock('./queries/hit');
vi.mock('./queries/removeExpired');

beforeEach(() => vi.resetAllMocks());

test('hit delegates to the query', async () => {
  vi.mocked(hit).mockResolvedValue(3);

  expect(await rateLimitService.hit('k', 1000)).toBe(3);
  expect(hit).toHaveBeenCalledWith('k', 1000);
});

test('removeExpired delegates to the query', async () => {
  await rateLimitService.removeExpired();
  expect(removeExpired).toHaveBeenCalled();
});
