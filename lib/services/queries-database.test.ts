import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import Knex, { type Knex as KnexInstance } from 'knex';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import createDatabase from '../utils/createDatabase';
import createLink from './link/queries/create';
import getLinkByUrl from './link/queries/getByUrl';
import getComment from './comment/queries/getComment';
import createPost from './post/queries/create';
import createPostComment from './post/queries/createComment';
import addPostTag from './post/queries/addTag';
import getPost from './post/queries/getPost';
import getPostList from './post/queries/getList';
import getPostComments from './post/queries/getComments';
import getPostTags from './post/queries/getTags';
import createTag from './tag/queries/create';
import getTagById from './tag/queries/getById';
import getTagByName from './tag/queries/getByName';
import getTagList from './tag/queries/getList';
import createUser from './user/queries/create';
import addLogin from './user/queries/addLogin';
import addUserTag from './user/queries/addTag';
import getUserById from './user/queries/getById';
import getUserList from './user/queries/getList';
import getUserTags from './user/queries/getTags';
import getLogin from './user/queries/getLogin';
import writeContent from './storage/queries/writeContent';
import readContent from './storage/queries/readContent';

vi.mock('../utils/createDatabase');

/** Runs the queries against a migrated in-memory sqlite, so their output validation sees real rows. */
const migrationsDir = join(__dirname, '../../migrations');
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
  await createTag('t1', 'news', 'text');
  await addUserTag('t1', 'u1', 'liked');
  await createPost('p1', 'u1', 'public');
  await addPostTag('p1', 't1');
  await createPostComment('c1', 'p1', undefined, 'u1');
  await createLink('k1', 'https://example.com');
  await writeContent('p1', 'post', 'hello');
});

afterAll(() => knex.destroy());

test('comment and link queries return valid rows', async () => {
  expect(await getComment('c1')).toMatchObject({ id: 'c1', post: 'p1' });
  expect(await getLinkByUrl('https://example.com')).toMatchObject({ id: 'k1' });
});

test('post queries return valid rows', async () => {
  expect(await getPost('p1')).toMatchObject({ id: 'p1', owner: 'u1' });
  expect(await getPostList('public', undefined, undefined, [], [])).toHaveLength(1);
  expect(await getPostComments('p1')).toHaveLength(1);
  expect(await getPostTags('p1')).toEqual([{ id: 't1', name: 'news', type: 'text' }]);
});

test('tag queries return valid rows', async () => {
  expect(await getTagById('t1')).toEqual({ id: 't1', name: 'news', type: 'text' });
  expect(await getTagByName('news')).toEqual({ id: 't1', type: 'text' });
  expect(await getTagList()).toHaveLength(1);
});

test('user queries return valid rows', async () => {
  expect(await getUserById('u1')).toMatchObject({ id: 'u1', name: 'Ann', role: 'user' });
  expect(await getUserList()).toHaveLength(1);
  expect(await getUserTags('u1')).toEqual([{ tag_id: 't1', type: 'liked' }]);
  expect(await getLogin('email', 'ann@example.com')).toEqual({ id: 'l1', user_id: 'u1' });
});

test('missing rows stay undefined', async () => {
  expect(await getPost('nope')).toBeUndefined();
  expect(await getUserById('nope')).toBeUndefined();
});

test('storage reads the stored body', async () => {
  expect(await readContent('p1', 'post')).toBe('hello');
});
