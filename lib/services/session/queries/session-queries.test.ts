import { beforeEach, expect, test, vi } from 'vitest';
import { fakeDb } from '../../../test-utils/fakeDb';
import create from './create';
import remove from './remove';
import isPending from './isPending';
import setLastActive from './setLastActive';
import setDetails from './setDetails';

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

test('setDetails only fills sessions without details', async () => {
  await setDetails('s1', 'UA', '1.2.3.4');
  expect(fakeDb.calls).toEqual([
    ['knex', 'users_session'],
    ['where', { id: 's1' }],
    ['whereNull', 'user_agent'],
    ['update', { user_agent: 'UA', remote_address: '1.2.3.4' }],
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

test('activate swaps a pending session to a fresh active id', async () => {
  fakeDb.resolves(1);
  expect(await (await import('./activate')).default('old', 'new')).toBe(1);
  expect(fakeDb.calls.slice(0, 3)).toEqual([
    ['knex', 'users_session'],
    ['where', { id: 'old', status: 'pending' }],
    ['update', expect.objectContaining({ id: 'new', status: 'active', secret: '' })],
  ]);
});

test('expireStale and purgeUnverified issue the cleanup statements', async () => {
  await (await import('./expireStale')).default(Date.UTC(2026, 0, 31));
  await (await import('./purgeUnverified')).default(Date.UTC(2026, 0, 31));
  const sql = fakeDb.calls.filter(call => call[0] === 'raw').map(call => String(call[1]));
  expect(sql).toHaveLength(4);
  expect(sql[0]).toContain("SET status = 'deleted'");
  expect(sql[1]).toContain("status = 'pending'");
  expect(sql[2]).toContain('DELETE FROM users_login');
  expect(sql[3]).toContain('DELETE FROM users');
});

test('isPending looks for a pending session with that id', async () => {
  fakeDb.resolves({ id: 's1' });
  expect(await isPending('s1')).toBe(true);
  expect(fakeDb.calls).toEqual([
    ['knex', 'users_session'],
    ['where', { id: 's1', status: 'pending' }],
    ['first', 'id'],
  ]);
});

test('isPending is false without a pending session', async () => {
  fakeDb.resolves(undefined);
  expect(await isPending('s1')).toBe(false);
});
