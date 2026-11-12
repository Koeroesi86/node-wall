import { beforeEach, expect, test, vi } from 'vitest';
import { fakeDb } from '../test-utils/fakeDb';
import getUserInfoFromSession from './getUserInfoFromSession';
import getUserSessions from './getUserSessions';

vi.mock('./createDatabase', async () => ({
  default: async () => (await import('../test-utils/fakeDb')).fakeDb.knex,
}));

beforeEach(() => {
  fakeDb.reset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

const session = { id: 's1', users_login_id: 'l1', status: 'active', created_at: Date.now(), last_active: Date.now() };
const login = { id: 'l1', type: 'email', user_id: 'u1', value: 'a@b.c' };
const user = { id: 'u1', name: 'Ann', role: 'user', created_at: 1 };

test('getUserInfoFromSession resolves the session, login and user', async () => {
  fakeDb.resolvesInOrder(session, login, user);
  expect(await getUserInfoFromSession('s1')).toEqual({ session, login, user });
  expect(fakeDb.calls.filter(call => call[0] === 'from')).toEqual([['from', 'users_session'], ['from', 'users_login'], ['from', 'users']]);
});

test('getUserInfoFromSession only looks up active sessions', async () => {
  fakeDb.resolvesInOrder(undefined);
  expect(await getUserInfoFromSession('s1')).toBeNull();
  expect(fakeDb.calls).toContainEqual(['where', { id: 's1', status: 'active' }]);
});

test.each([
  ['session', [undefined]],
  ['login', [session, undefined]],
  ['user', [session, login, undefined]],
])('getUserInfoFromSession returns null when the %s is missing', async (_name, results) => {
  fakeDb.resolvesInOrder(...results);
  expect(await getUserInfoFromSession('s1')).toBeNull();
});

test('getUserInfoFromSession returns null when the database fails', async () => {
  fakeDb.rejects(new Error('db down'));
  expect(await getUserInfoFromSession('s1')).toBeNull();
});

test('getUserSessions joins logins and sessions of a user', async () => {
  fakeDb.resolves([{ sessionId: 's1' }]);
  expect(await getUserSessions('u1')).toEqual([{ sessionId: 's1' }]);
  expect(fakeDb.calls.map(call => call[0])).toEqual(['select', 'from', 'where', 'leftJoin', 'leftJoin']);
  expect(fakeDb.calls).toContainEqual(['where', { 'users.id': 'u1' }]);
});

test('getUserSessions returns null when the database fails', async () => {
  fakeDb.rejects(new Error('db down'));
  expect(await getUserSessions('u1')).toBeNull();
});

test('getUserInfoFromSession rejects expired sessions', async () => {
  fakeDb.resolvesInOrder({ ...session, created_at: 1, last_active: null }, login, user);
  expect(await getUserInfoFromSession('s1')).toBeNull();
});
