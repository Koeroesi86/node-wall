import { beforeEach, expect, test, vi } from 'vitest';
import { fakeDb } from '../../../test-utils/fakeDb';
import getComment from './getComment';

vi.mock('../../../utils/createDatabase', async () => ({
  default: async () => (await import('../../../test-utils/fakeDb')).fakeDb.knex,
}));

beforeEach(() => fakeDb.reset());

test('getComment only returns public comments', async () => {
  fakeDb.resolves({ id: 'c1' });
  expect(await getComment('c1')).toEqual({ id: 'c1' });
  expect(fakeDb.calls).toEqual([
    ['knex', 'posts_comments'],
    ['where', { id: 'c1', status: 'public' }],
    ['select', '*'],
    ['first'],
  ]);
});
