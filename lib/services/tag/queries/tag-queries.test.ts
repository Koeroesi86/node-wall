import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fakeDb } from '../../../test-utils/fakeDb';
import create from './create';
import getById from './getById';
import getByName from './getByName';
import getList from './getList';

vi.mock('../../../utils/createDatabase', async () => ({
  default: async () => (await import('../../../test-utils/fakeDb')).fakeDb.knex,
}));

beforeEach(() => fakeDb.reset());

test('create inserts a tag', async () => {
  await create('t1', 'news', 'text');
  expect(fakeDb.calls).toEqual([['insert', { id: 't1', name: 'news', type: 'text' }], ['into', 'tags']]);
});

test('getById selects one tag', async () => {
  fakeDb.resolves({ id: 't1', name: 'tag', type: null });
  expect(await getById('t1')).toEqual({ id: 't1', name: 'tag', type: null });
  expect(fakeDb.calls).toEqual([
    ['knex', 'tags'],
    ['select', 'id', 'name', 'type'],
    ['where', 'id', 't1'],
    ['first'],
  ]);
});

test('getByName selects one tag', async () => {
  await getByName('news');
  expect(fakeDb.calls).toEqual([['knex', 'tags'], ['select', 'id', 'type'], ['where', 'name', 'news'], ['first']]);
});

describe('getList', () => {
  test('lists everything without a search', async () => {
    fakeDb.resolves([{ id: 't1', name: 'tag', type: null }]);
    expect(await getList()).toEqual([{ id: 't1', name: 'tag', type: null }]);
    expect(fakeDb.calls).toEqual([['knex', 'tags'], ['select', 'id', 'name', 'type'], ['limit', 100]]);
  });

  test('matches partially by default', async () => {
    fakeDb.resolves([]);
    await getList('ne');
    expect(fakeDb.calls).toContainEqual(['where', 'name', 'like', '%ne%']);
  });

  test('matches exactly when asked', async () => {
    fakeDb.resolves([]);
    await getList('news', true);
    expect(fakeDb.calls).toContainEqual(['where', 'name', 'news']);
  });
});
