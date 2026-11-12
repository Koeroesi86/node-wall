import { beforeEach, expect, test, vi } from 'vitest';
import { fakeDb } from '../../../test-utils/fakeDb';
import getRecent from './getRecent';
import log from './log';
import removeExpired from './removeExpired';

vi.mock('../../../utils/createDatabase', async () => ({
  default: async () => (await import('../../../test-utils/fakeDb')).fakeDb.knex,
}));

beforeEach(() => fakeDb.reset());

test('log inserts an entry with empty target and request by default', async () => {
  await log('a1', 'u1', 'tag.created', undefined, undefined, 7);
  expect(fakeDb.calls).toEqual([
    ['knex', 'audit_log'],
    ['insert', { id: 'a1', user_id: 'u1', action: 'tag.created', target_id: null, request_id: null, created_at: 7 }],
  ]);
});

test('getRecent selects the newest entries', async () => {
  fakeDb.resolves([{ id: 'a1', user_id: 'u1', user_name: 'Ann', action: 'x', target_id: null, request_id: null, created_at: 1 }]);
  expect(await getRecent(10)).toHaveLength(1);
  expect(fakeDb.calls).toEqual([
    ['knex', 'audit_log'],
    ['leftJoin', 'users', 'users.id', 'audit_log.user_id'],
    ['select',
      'audit_log.id', 'audit_log.user_id', 'audit_log.action', 'audit_log.target_id', 'audit_log.request_id', 'audit_log.created_at',
      'users.name as user_name'],
    ['whereNot', 'audit_log.action', 'like', 'account.%'],
    ['orderBy', 'audit_log.created_at', 'desc'],
    ['limit', 10],
  ]);
});

test('removeExpired deletes entries before the cutoff', async () => {
  await removeExpired(5);
  expect(fakeDb.calls).toEqual([['knex', 'audit_log'], ['where', 'created_at', '<', 5], ['delete']]);
});
