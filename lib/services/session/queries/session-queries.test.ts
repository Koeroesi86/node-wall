import { beforeEach, expect, test, vi } from 'vitest';
import { fakeDb } from '../../../test-utils/fakeDb';
import create from './create';
import remove from './remove';
import setLastActive from './setLastActive';

vi.mock('../../../utils/createDatabase', async () => ({
  default: async () => (await import('../../../test-utils/fakeDb')).fakeDb.knex,
}));

beforeEach(() => fakeDb.reset());

test('create inserts a pending session by default', async () => {
  await create('s1', 'l1', 'hash');
  expect(fakeDb.calls).toEqual([
    ['insert', { id: 's1', users_login_id: 'l1', secret: 'hash', status: 'pending' }],
    ['into', 'users_session'],
  ]);
});

test('remove marks the session deleted and clears the secret', async () => {
  await remove('s1');
  expect(fakeDb.calls).toEqual([
    ['knex', 'users_session'],
    ['where', { id: 's1' }],
    ['update', { status: 'deleted', secret: '' }],
  ]);
});

test('setLastActive updates the timestamp', async () => {
  await setLastActive('s1');
  expect(fakeDb.calls).toEqual([
    ['knex', 'users_session'],
    ['where', { id: 's1' }],
    ['update', { last_active: expect.any(Number) }],
  ]);
});

// Known bug: the lastActive argument is ignored and the current time is always stored.
test.fails('setLastActive stores the given time', async () => {
  await setLastActive('s1', 1234);
  expect(fakeDb.calls).toContainEqual(['update', { last_active: 1234 }]);
});
