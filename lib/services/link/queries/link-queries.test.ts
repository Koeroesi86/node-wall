import { beforeEach, expect, test, vi } from 'vitest';
import { fakeDb } from '../../../test-utils/fakeDb';
import create from './create';
import getByUrl from './getByUrl';

vi.mock('../../../utils/createDatabase', async () => ({
  default: async () => (await import('../../../test-utils/fakeDb')).fakeDb.knex,
}));

beforeEach(() => fakeDb.reset());

test('create stores the url under the id', async () => {
  await create('l1', 'https://example.com');
  expect(fakeDb.calls).toEqual([['insert', { id: 'l1', url: 'https://example.com' }], ['into', 'links']]);
});

test('getByUrl finds a link by url', async () => {
  fakeDb.resolves({ id: 'l1' });
  expect(await getByUrl('https://example.com')).toEqual({ id: 'l1' });
  expect(fakeDb.calls).toEqual([
    ['knex', 'links'],
    ['select', 'id', 'created_at'],
    ['where', 'url', 'https://example.com'],
    ['first'],
  ]);
});
