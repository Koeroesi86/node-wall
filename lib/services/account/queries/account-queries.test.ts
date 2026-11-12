import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import Knex, { type Knex as KnexInstance } from 'knex';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import createDatabase from '../../../utils/createDatabase';
import createUser from '../../user/queries/create';
import addLogin from '../../user/queries/addLogin';
import addUserTag from '../../user/queries/addTag';
import createTag from '../../tag/queries/create';
import createPost from '../../post/queries/create';
import createPostComment from '../../post/queries/createComment';
import writeContent from '../../storage/queries/writeContent';
import createSession from '../../session/queries/create';
import setDetails from '../../session/queries/setDetails';
import bumpConfirmationAttempts from './bumpConfirmationAttempts';
import deleteAccount from './deleteAccount';
import exportData from './exportData';
import getConfirmation from './getConfirmation';
import logAudit from '../../audit/queries/log';
import removeConfirmation from './removeConfirmation';
import saveConfirmation from './saveConfirmation';

vi.mock('../../../utils/createDatabase');

/** Runs the queries against a migrated in-memory sqlite, as deleting and exporting span many tables. */
const migrationsDir = join(__dirname, '../../../../migrations');
const migrationSource = {
  getMigrations: async () => readdirSync(migrationsDir).filter(file => /^\d+_.*\.ts$/.test(file)).sort(),
  getMigrationName: (migration: string) => migration,
  getMigration: (migration: string) => import(join(migrationsDir, migration)),
};

let knex: KnexInstance;

beforeAll(async () => {
  knex = Knex({ client: 'sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true, pool: { min: 1, max: 1 } });
  await knex.migrate.latest({ migrationSource });
  vi.mocked(createDatabase).mockResolvedValue(knex);

  await createUser('u1', 'Ann');
  await addLogin('l1', 'u1', 'ann@example.com');
  await createSession('s1', 'l1', 'secret', 'active');
  await setDetails('s1', 'UA', '1.2.3.4');
  await createTag('t1', 'news', 'text');
  await addUserTag('t1', 'u1', 'liked');
  await createPost('p1', 'u1', 'public');
  await writeContent('p1', 'post', 'my post');
  await createPostComment('c1', 'p1', undefined, 'u1');
  await writeContent('c1', 'comment', 'my comment');

  await createUser('u2', 'Bob');
  await addLogin('l2', 'u2', 'bob@example.com');
  await createSession('s2', 'l2', 'secret', 'active');
  await createPost('p2', 'u2', 'public');
  await createPost('p3', null, 'public');
});

afterAll(() => knex.destroy());

test('confirmations are saved, counted and removed', async () => {
  await saveConfirmation('u1', 'hash', 5);
  await bumpConfirmationAttempts('u1');
  expect(await getConfirmation('u1')).toEqual({ user_id: 'u1', secret: 'hash', attempts: 1, created_at: 5 });

  await saveConfirmation('u1', 'newer', 6);
  expect(await getConfirmation('u1')).toMatchObject({ secret: 'newer', attempts: 0, created_at: 6 });

  await removeConfirmation('u1');
  expect(await getConfirmation('u1')).toBeUndefined();
});

test('logAudit appends an entry', async () => {
  await logAudit('a1', 'u1', 'account.exported', undefined, undefined, 7);
  expect(await knex('audit_log').where({ id: 'a1' }).first()).toEqual({ id: 'a1', user_id: 'u1', action: 'account.exported', target_id: null, request_id: null, created_at: 7 });
});

test('exportData returns the user data without secrets or other users', async () => {
  const data = await exportData('u1');

  expect(data).toEqual({
    profile: { id: 'u1', name: 'Ann', role: 'user', created_at: expect.anything() },
    logins: [{ type: 'email', value: 'ann@example.com' }],
    sessions: [{ status: 'active', created_at: expect.anything(), last_active: null, user_agent: 'UA', remote_address: '1.2.3.4' }],
    tags: [{ tag_id: 't1', type: 'liked' }],
    posts: [{ id: 'p1', status: 'public', created_at: expect.anything(), content: 'my post' }],
    comments: [{ id: 'c1', post: 'p1', parent: null, status: 'public', created_at: expect.anything(), content: 'my comment' }],
  });
  expect(JSON.stringify(data)).not.toContain('secret');
});

test('deleteAccount erases the user but keeps their content, anonymised', async () => {
  await saveConfirmation('u1', 'hash');
  await deleteAccount('u1');

  expect(await knex('users').where({ id: 'u1' }).first()).toBeUndefined();
  expect(await knex('users_login').where({ user_id: 'u1' })).toEqual([]);
  expect(await knex('users_session').where({ users_login_id: 'l1' })).toEqual([]);
  expect(await knex('users_tags').where({ user_id: 'u1' })).toEqual([]);
  expect(await getConfirmation('u1')).toBeUndefined();
  expect(await knex('posts').where({ id: 'p1' }).first()).toMatchObject({ owner: null, status: 'public' });
  expect(await knex('posts_comments').where({ id: 'c1' }).first()).toMatchObject({ owner: null });
  expect(await knex('contents').where({ id: 'p1' }).first()).toMatchObject({ body: 'my post' });
  expect(await knex('audit_log').where({ id: 'a1' }).first()).toBeDefined();
});

test('deleteAccount leaves other users alone', async () => {
  expect(await knex('users').where({ id: 'u2' }).first()).toBeDefined();
  expect(await knex('users_session').where({ id: 's2' }).first()).toBeDefined();
  expect(await knex('posts').where({ id: 'p2' }).first()).toMatchObject({ owner: 'u2' });
  expect(await knex('posts').where({ id: 'p3' }).first()).toMatchObject({ owner: null });
});
