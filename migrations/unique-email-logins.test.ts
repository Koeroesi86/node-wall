import Knex from 'knex';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import * as createUsers from './20190921085355_create_users';
import * as uniqueEmailLogins from './20261112140000_unique_email_logins';

const knex = Knex({ client: 'sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });

beforeEach(async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  await createUsers.up(knex);
  await knex('users').insert([
    { id: 'u-new', created_at: '2020-02-01' },
    { id: 'u-old', created_at: '2020-01-01' },
  ]);
  await knex('users_login').insert([
    { id: 'l-new', user_id: 'u-new', type: 'email', value: 'a@example.com' },
    { id: 'l-old', user_id: 'u-old', type: 'email', value: 'A@Example.com' },
    { id: 'l-single', user_id: 'u-new', type: 'email', value: 'B@Example.com' },
    { id: 'l-google', user_id: 'u-new', type: 'google', value: 'AbC' },
  ]);
  await knex('users_session').insert({ id: 's1', users_login_id: 'l-new' });
});

afterEach(async () => {
  await createUsers.down(knex);
  vi.restoreAllMocks();
});

test('merges case-only duplicates into the oldest user and lowercases emails', async () => {
  await uniqueEmailLogins.up(knex);

  const logins = await knex('users_login').select('id', 'value').orderBy('id');
  expect(logins).toEqual([
    { id: 'l-google', value: 'AbC' },
    { id: 'l-old', value: 'a@example.com' },
    { id: 'l-single', value: 'b@example.com' },
  ]);
  expect(await knex('users_session').first('users_login_id')).toEqual({ users_login_id: 'l-old' });
  expect(await knex('users').count({ count: '*' }).first()).toEqual({ count: 2 });
});

test('rejects a duplicate login afterwards', async () => {
  await uniqueEmailLogins.up(knex);
  await expect(knex('users_login').insert({ id: 'x', user_id: 'u-old', type: 'email', value: 'a@example.com' })).rejects.toThrow();
});

test('down drops the unique index', async () => {
  await uniqueEmailLogins.up(knex);
  await uniqueEmailLogins.down(knex);
  await knex('users_login').insert({ id: 'x', user_id: 'u-old', type: 'email', value: 'a@example.com' });
});
