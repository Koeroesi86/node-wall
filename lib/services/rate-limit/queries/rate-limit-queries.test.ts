import { beforeEach, expect, test, vi } from 'vitest';
import { fakeDb } from '../../../test-utils/fakeDb';
import hit from './hit';
import removeExpired from './removeExpired';

vi.mock('../../../utils/createDatabase', async () => ({
  default: async () => (await import('../../../test-utils/fakeDb')).fakeDb.knex,
}));

beforeEach(() => fakeDb.reset());

test('hit upserts the counter and returns the count', async () => {
  fakeDb.resolves({ count: 2 });

  expect(await hit('k', 1000, 5)).toBe(2);
  expect(fakeDb.calls[0]).toEqual(['raw', expect.stringContaining('ON CONFLICT(key)'), ['k', 1005, 5, 5, 1005]]);
  expect(fakeDb.calls.slice(1)).toEqual([
    ['knex', 'rate_limits'],
    ['where', { key: 'k' }],
    ['first', 'count'],
  ]);
});

test('removeExpired deletes elapsed windows', async () => {
  await removeExpired(5);

  expect(fakeDb.calls).toEqual([
    ['knex', 'rate_limits'],
    ['where', 'reset_at', '<=', 5],
    ['delete'],
  ]);
});
