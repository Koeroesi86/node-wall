import { beforeEach, expect, test, vi } from 'vitest';
import create from './queries/create';
import remove from './queries/remove';
import setLastActive from './queries/setLastActive';
import sessionService from './index';

vi.mock('./queries/create');
vi.mock('./queries/remove');
vi.mock('./queries/setLastActive');

beforeEach(() => vi.resetAllMocks());

test('create stores the session and returns it', async () => {
  expect(await sessionService.create('s1', 'l1', 'hash')).toEqual({
    id: 's1',
    status: 'pending',
    secret: 'hash',
    users_login_id: 'l1',
  });
  expect(create).toHaveBeenCalledWith('s1', 'l1', 'hash', 'pending');
});

test('create passes a custom status through', async () => {
  const session = await sessionService.create('s1', 'l1', 'hash', 'active');
  expect(session.status).toBe('active');
  expect(create).toHaveBeenCalledWith('s1', 'l1', 'hash', 'active');
});

test('setLastActive delegates to the query', async () => {
  await sessionService.setLastActive('s1', 123);
  expect(setLastActive).toHaveBeenCalledWith('s1', 123);
});

test('remove delegates to the query', async () => {
  await sessionService.remove('s1');
  expect(remove).toHaveBeenCalledWith('s1');
});
