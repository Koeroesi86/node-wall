import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fakeDb } from '../../../test-utils/fakeDb';
import addTag from './addTag';
import create from './create';
import createComment from './createComment';
import getBounds from './getBounds';
import getComments from './getComments';
import getList from './getList';
import getNextPage from './getNextPage';
import getPost from './getPost';
import getTags from './getTags';
import removeTag from './removeTag';
import setStatus from './setStatus';

vi.mock('../../../utils/createDatabase', async () => ({
  default: async () => (await import('../../../test-utils/fakeDb')).fakeDb.knex,
}));

beforeEach(() => fakeDb.reset());

test('addTag links a tag to a post', async () => {
  await addTag('p1', 't1');
  expect(fakeDb.calls).toEqual([['insert', { post_id: 'p1', tag_id: 't1' }], ['into', 'posts_tags']]);
});

test('create inserts a pending post by default', async () => {
  await create('p1', 'u1');
  expect(fakeDb.calls).toEqual([
    ['insert', { id: 'p1', type: 'post', status: 'pending', owner: 'u1', created_at: expect.any(Number) }],
    ['into', 'posts'],
  ]);
});

test('create accepts status, type and an anonymous owner', async () => {
  await create('p1', null, 'public', 'other');
  expect(fakeDb.calls[0]).toEqual(['insert', expect.objectContaining({ status: 'public', type: 'other', owner: null })]);
});

test('createComment inserts a public comment', async () => {
  await createComment('c1', 'p1', 'c0', 'u1');
  expect(fakeDb.calls).toEqual([
    ['insert', { id: 'c1', post: 'p1', parent: 'c0', owner: 'u1', status: 'public' }],
    ['into', 'posts_comments'],
  ]);
});

test('getBounds returns the oldest and newest public post', async () => {
  fakeDb.resolves({ oldest: 1, newest: 2 });
  expect(await getBounds()).toEqual({ oldest: 1, newest: 2 });
  expect(fakeDb.calls).toEqual([
    ['knex', 'posts'],
    ['where', 'status', 'public'],
    ['min', 'created_at as oldest'],
    ['max', 'created_at as newest'],
    ['first'],
  ]);
});

test('getComments filters by post and status', async () => {
  fakeDb.resolves([{ id: 'c1' }]);
  expect(await getComments('p1')).toEqual([{ id: 'c1' }]);
  expect(fakeDb.calls).toEqual([
    ['knex', 'posts_comments'],
    ['where', { post: 'p1', status: 'public' }],
    ['select', 'id', 'parent', 'owner', 'created_at'],
  ]);
});

test('getPost selects one post by id', async () => {
  fakeDb.resolves({ id: 'p1' });
  expect(await getPost('p1')).toEqual({ id: 'p1' });
  expect(fakeDb.calls).toEqual([
    ['knex', 'posts'],
    ['select', 'id', 'owner', 'created_at', 'status', 'type'],
    ['where', 'id', 'p1'],
    ['first'],
  ]);
});

test('getTags joins the tag details', async () => {
  fakeDb.resolves([{ id: 't1' }]);
  expect(await getTags('p1')).toEqual([{ id: 't1' }]);
  expect(fakeDb.calls).toEqual([
    ['knex', 'posts_tags'],
    ['leftJoin', 'tags', 'tags.id', 'posts_tags.tag_id'],
    ['where', 'posts_tags.post_id', 'p1'],
    ['select', 'tags.id', 'tags.name', 'tags.type'],
  ]);
});

test('removeTag deletes the link', async () => {
  await removeTag('p1', 't1');
  expect(fakeDb.calls).toEqual([['knex', 'posts_tags'], ['where', { post_id: 'p1', tag_id: 't1' }], ['delete']]);
});

test('setStatus updates the post status', async () => {
  await setStatus('p1', 'public');
  expect(fakeDb.calls).toEqual([['knex', 'posts'], ['where', { id: 'p1' }], ['update', { status: 'public' }]]);
});

describe('getList', () => {
  test('filters by status only without options', async () => {
    fakeDb.resolves([{ id: 'p1' }]);
    expect(await getList('public', undefined, undefined, [], [])).toEqual([{ id: 'p1' }]);
    expect(fakeDb.calls).toEqual([
      ['knex', 'posts'],
      ['select', 'id', 'owner', 'type', 'created_at'],
      ['orderBy', 'created_at', 'desc'],
      ['groupBy', 'posts.id'],
      ['where', 'status', 'public'],
    ]);
  });

  test('applies before and since bounds', async () => {
    await getList('public', '20', '10', [], []);
    expect(fakeDb.calls).toContainEqual(['where', 'created_at', '<', '20']);
    expect(fakeDb.calls).toContainEqual(['where', 'created_at', '>=', '10']);
  });

  test('requires liked tags and excludes disliked ones', async () => {
    await getList('public', undefined, undefined, ['a'], ['b']);
    expect(fakeDb.calls.map(call => call[0])).toEqual(expect.arrayContaining(['havingExists', 'havingNotExists']));
    expect(fakeDb.runCallback('havingExists')).toEqual([
      ['select', '*'],
      ['from', 'posts_tags'],
      ['whereRaw', 'posts.id = posts_tags.post_id'],
      ['whereIn', 'tag_id', ['a']],
    ]);
    expect(fakeDb.runCallback('havingNotExists')).toContainEqual(['whereIn', 'tag_id', ['b']]);
  });
});

describe('getNextPage', () => {
  test('returns the first row of the newest created_at', async () => {
    fakeDb.resolves({ nextPageBefore: 5 });
    expect(await getNextPage('public', undefined, undefined, [], [])).toEqual({ nextPageBefore: 5 });
    expect(fakeDb.calls).toEqual([
      ['knex', 'posts'],
      ['max', 'created_at', { as: 'nextPageBefore' }],
      ['groupBy', 'posts.id'],
      ['where', 'status', 'public'],
      ['first'],
    ]);
  });

  test('looks only before since and applies the tag filters', async () => {
    await getNextPage('public', undefined, '10', ['a'], ['b']);
    expect(fakeDb.calls).toContainEqual(['where', 'created_at', '<', '10']);
    expect(fakeDb.runCallback('havingExists')).toContainEqual(['whereIn', 'tag_id', ['a']]);
    expect(fakeDb.runCallback('havingNotExists')).toContainEqual(['whereIn', 'tag_id', ['b']]);
  });
});
