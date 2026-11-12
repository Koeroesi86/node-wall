import { beforeEach, describe, expect, test, vi } from 'vitest';
import storage from '../storage';
import addTag from './queries/addTag';
import create from './queries/create';
import createComment from './queries/createComment';
import getBounds from './queries/getBounds';
import getComments from './queries/getComments';
import getList from './queries/getList';
import getNextPage from './queries/getNextPage';
import getPost from './queries/getPost';
import getTags from './queries/getTags';
import removeTag from './queries/removeTag';
import setStatus from './queries/setStatus';
import postService from './index';

vi.mock('crypto', () => ({ randomUUID: () => 'new-id' }));
vi.mock('../storage');
vi.mock('./queries/addTag');
vi.mock('./queries/create');
vi.mock('./queries/createComment');
vi.mock('./queries/getBounds');
vi.mock('./queries/getComments');
vi.mock('./queries/getList');
vi.mock('./queries/getNextPage');
vi.mock('./queries/getPost');
vi.mock('./queries/getTags');
vi.mock('./queries/removeTag');
vi.mock('./queries/setStatus');

beforeEach(() => vi.resetAllMocks());

describe('create', () => {
  test('stores sanitised content and the post record', async () => {
    await postService.create('  <b>Hi</b>&nbsp;there\n\n\n\nbye  ', 'u1');

    expect(storage.write).toHaveBeenCalledWith('new-id', 'post', 'Hi there\n\nbye');
    expect(create).toHaveBeenCalledWith('new-id', 'u1');
  });

  test('stores the content before the record, under the given type', async () => {
    const order: string[] = [];
    vi.mocked(storage.write).mockImplementation(async () => void order.push('storage'));
    vi.mocked(create).mockImplementation(async () => void order.push('record'));

    await postService.create('x', null, 'other');

    expect(order).toEqual(['storage', 'record']);
    expect(storage.write).toHaveBeenCalledWith('new-id', 'other', 'x');
  });
});

describe('createComment', () => {
  test('stores sanitised content and the comment record', async () => {
    await postService.createComment('p1', 'c0', 'u1', ' <i>nice</i>\n\n\n\nthing ');

    expect(storage.write).toHaveBeenCalledWith('new-id', 'comment', 'nice\n\nthing');
    expect(createComment).toHaveBeenCalledWith('new-id', 'p1', 'c0', 'u1');
  });
});

describe('getBounds', () => {
  test('returns the bounds', async () => {
    vi.mocked(getBounds).mockResolvedValue({ oldest: 1, newest: 2 });
    expect(await postService.getBounds()).toEqual({ oldest: 1, newest: 2 });
  });

  test('falls back to empty bounds', async () => {
    vi.mocked(getBounds).mockResolvedValue(undefined);
    expect(await postService.getBounds()).toEqual({ oldest: null, newest: null });
  });
});

test('getContent reads the stored post by default', async () => {
  vi.mocked(storage.read).mockResolvedValue('text');
  expect(await postService.getContent('p1')).toBe('text');
  expect(storage.read).toHaveBeenCalledWith('p1', 'post');
});

test('reads delegate to the queries', async () => {
  vi.mocked(getPost, { partial: true }).mockResolvedValue({ id: 'p1' });
  vi.mocked(getTags, { partial: true }).mockResolvedValue([{ id: 't1', name: 'tag', type: null }]);
  vi.mocked(getComments, { partial: true }).mockResolvedValue([{ id: 'c1', parent: null, owner: null, created_at: null }]);
  vi.mocked(getList, { partial: true }).mockResolvedValue([{ id: 'p1', owner: null, type: null, created_at: null }]);
  vi.mocked(getNextPage).mockResolvedValue({ nextPageBefore: 5 });

  expect(await postService.get('p1')).toEqual({ id: 'p1' });
  expect(await postService.getTags('p1')).toEqual([expect.objectContaining({ id: 't1' })]);
  expect(await postService.getComments('p1')).toEqual([expect.objectContaining({ id: 'c1' })]);
  expect(await postService.getList('public', '2', '1', ['a'], ['b'])).toEqual([expect.objectContaining({ id: 'p1' })]);
  expect(await postService.getNextPage('public', '2', '1', ['a'], ['b'])).toEqual({ nextPageBefore: 5 });

  expect(getComments).toHaveBeenCalledWith('p1', 'public');
  expect(getList).toHaveBeenCalledWith('public', '2', '1', ['a'], ['b']);
  expect(getNextPage).toHaveBeenCalledWith('public', '2', '1', ['a'], ['b']);
});

// Known bug: the service overwrites the status argument with 'public'.
test.fails('getComments passes the requested status on', async () => {
  await postService.getComments('p1', 'pending');
  expect(getComments).toHaveBeenCalledWith('p1', 'pending');
});

test('writes delegate to the queries', async () => {
  await postService.setStatus('p1', 'public');
  await postService.addTag('p1', 't1');
  await postService.removeTag('p1', 't1');

  expect(setStatus).toHaveBeenCalledWith('p1', 'public');
  expect(addTag).toHaveBeenCalledWith('p1', 't1');
  expect(removeTag).toHaveBeenCalledWith('p1', 't1');
});
