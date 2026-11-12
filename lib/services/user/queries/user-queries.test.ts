import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fakeDb } from '../../../test-utils/fakeDb';
import addLogin from './addLogin';
import addTag from './addTag';
import create from './create';
import getById from './getById';
import getList from './getList';
import setRole from './setRole';
import getLogin from './getLogin';
import getTags from './getTags';
import removeTag from './removeTag';
import setName from './setName';

vi.mock('../../../utils/createDatabase', async () => ({
  default: async () => (await import('../../../test-utils/fakeDb')).fakeDb.knex,
}));

beforeEach(() => fakeDb.reset());

test('addLogin defaults to an email login', async () => {
  await addLogin('l1', 'u1', 'a@b.c');
  expect(fakeDb.calls).toEqual([
    ['insert', { id: 'l1', user_id: 'u1', type: 'email', value: 'a@b.c' }],
    ['into', 'users_login'],
  ]);
});

test('create inserts a user with the default role', async () => {
  await create('u1', 'Ann');
  expect(fakeDb.calls[0]).toEqual(['insert', { id: 'u1', name: 'Ann', role: 'user' }]);
});

test('getById selects a user', async () => {
  fakeDb.resolves({ id: 'u1', name: 'Ann', role: 'user', created_at: 1 });
  expect(await getById('u1')).toEqual({ id: 'u1', name: 'Ann', role: 'user', created_at: 1 });
  expect(fakeDb.calls).toEqual([
    ['knex', 'users'],
    ['select', 'name', 'id', 'role', 'created_at'],
    ['where', 'id', 'u1'],
    ['first'],
  ]);
});

test('getLogin looks a login up by type and value', async () => {
  await getLogin('email', 'a@b.c');
  expect(fakeDb.calls).toEqual([
    ['select', 'id', 'user_id'],
    ['where', { type: 'email', value: 'a@b.c' }],
    ['from', 'users_login'],
    ['first'],
  ]);
});

test('getTags lists the tags of a user', async () => {
  fakeDb.resolves([]);
  await getTags('u1');
  expect(fakeDb.calls).toEqual([['knex', 'users_tags'], ['select', 'tag_id', 'type'], ['where', { user_id: 'u1' }]]);
});

test('removeTag deletes the tag of the user', async () => {
  await removeTag('t1', 'u1');
  expect(fakeDb.calls).toEqual([['knex', 'users_tags'], ['delete'], ['where', { tag_id: 't1', user_id: 'u1' }]]);
});

test('setName updates the name', async () => {
  await setName('u1', 'Ann');
  expect(fakeDb.calls).toEqual([['knex', 'users'], ['update', { name: 'Ann' }], ['where', { id: 'u1' }]]);
});

describe('addTag', () => {
  test('inserts when the user has no such tag yet', async () => {
    await addTag('t1', 'u1', 'liked');
    expect(fakeDb.calls).toContainEqual(['insert', { tag_id: 't1', user_id: 'u1', type: 'liked' }]);
    expect(fakeDb.calls).not.toContainEqual(['update', expect.anything()]);
  });

  test('updates the type when the tag already exists', async () => {
    fakeDb.resolves({ tag_id: 't1', type: 'disliked' });
    await addTag('t1', 'u1', 'liked');
    expect(fakeDb.calls).toContainEqual(['update', { type: 'liked' }]);
    expect(fakeDb.calls).not.toContainEqual(['insert', expect.anything()]);
  });
});

test('getList selects users newest first', async () => {
  fakeDb.resolves([{ id: 'u1', name: 'Ann', role: 'user', created_at: 1 }]);
  expect(await getList()).toEqual([{ id: 'u1', name: 'Ann', role: 'user', created_at: 1 }]);
  expect(fakeDb.calls).toEqual([
    ['knex', 'users'],
    ['select', 'id', 'name', 'role', 'created_at'],
    ['orderBy', 'created_at', 'desc'],
  ]);
});

test('setRole updates the role of a user', async () => {
  await setRole('u1', 'admin');
  expect(fakeDb.calls).toEqual([
    ['knex', 'users'],
    ['update', { role: 'admin' }],
    ['where', { id: 'u1' }],
  ]);
});
