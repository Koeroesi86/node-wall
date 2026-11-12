import { beforeEach, expect, test, vi } from 'vitest';
import storage from '../storage';
import getComment from './queries/getComment';
import commentService from './index';

vi.mock('../storage');
vi.mock('./queries/getComment');

beforeEach(() => vi.resetAllMocks());

test('get merges the stored body into the comment', async () => {
  vi.mocked(getComment, { partial: true }).mockResolvedValue({ id: 'c1', post: 'p1' });
  vi.mocked(storage.read).mockResolvedValue('hello');

  expect(await commentService.get('c1')).toEqual({ id: 'c1', post: 'p1', body: 'hello' });
  expect(storage.read).toHaveBeenCalledWith('c1', 'comment');
});

test('get throws for an unknown comment', async () => {
  vi.mocked(getComment).mockResolvedValue(undefined);

  await expect(commentService.get('nope')).rejects.toThrow('no comment with id nope');
  expect(storage.read).not.toHaveBeenCalled();
});
