import { beforeEach, expect, test, vi } from 'vitest';
import { fakeDb } from '../../../test-utils/fakeDb';
import getComment from './getComment';

vi.mock('../../../utils/createDatabase', async () => ({
  default: async () => (await import('../../../test-utils/fakeDb')).fakeDb.knex,
}));

beforeEach(() => fakeDb.reset());

test('getComment only returns public comments of public posts, without owner columns', async () => {
  fakeDb.resolves({ id: 'c1', post: 'p1', parent: null, created_at: 1 });
  expect(await getComment('c1')).toEqual({ id: 'c1', post: 'p1', parent: null, created_at: 1 });
  expect(fakeDb.calls).toEqual([
    ['knex', 'posts_comments'],
    ['join', 'posts', 'posts.id', 'posts_comments.post'],
    ['where', 'posts_comments.id', 'c1'],
    ['where', 'posts_comments.status', 'public'],
    ['where', 'posts.status', 'public'],
    ['select', 'posts_comments.id', 'posts_comments.post', 'posts_comments.parent', 'posts_comments.created_at'],
    ['first'],
  ]);
});
