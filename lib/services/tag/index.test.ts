import { beforeEach, expect, test, vi } from 'vitest';
import create from './queries/create';
import getById from './queries/getById';
import getByName from './queries/getByName';
import getList from './queries/getList';
import tagService from './index';

vi.mock('crypto', () => ({ randomUUID: () => 'new-id' }));
vi.mock('./queries/create');
vi.mock('./queries/getById');
vi.mock('./queries/getByName');
vi.mock('./queries/getList');

beforeEach(() => vi.resetAllMocks());

test('create generates an id and stores the tag', async () => {
  expect(await tagService.create('news', 'text')).toEqual({ id: 'new-id', name: 'news', type: 'text' });
  expect(create).toHaveBeenCalledWith('new-id', 'news', 'text');
});

test('get, getByName and getList delegate to the queries', async () => {
  vi.mocked(getById, { partial: true }).mockResolvedValue({ id: 't1' });
  vi.mocked(getByName, { partial: true }).mockResolvedValue({ id: 't2' });
  vi.mocked(getList).mockResolvedValue([]);

  expect(await tagService.get('t1')).toEqual({ id: 't1' });
  expect(await tagService.getByName('news')).toEqual({ id: 't2' });
  expect(await tagService.getList('ne', true)).toEqual([]);
  expect(getList).toHaveBeenCalledWith('ne', true);
});

test('getList searches nothing and not exactly by default', async () => {
  await tagService.getList();
  expect(getList).toHaveBeenCalledWith('', false);
});
