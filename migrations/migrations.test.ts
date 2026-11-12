import { describe, expect, test, vi } from 'vitest';
import * as createPosts from './20190914142639_create_posts';
import * as createUsers from './20190921085355_create_users';
import * as createLinks from './20191007194941_create_links';
import * as createUsersTags from './20191026165535_create_users_tags';
import * as alterSessions from './20200412091151_alter_sessions';
import * as createPostsComments from './20200801095547_create_posts_comments';

const format = (args: unknown[]) => args.map(arg => JSON.stringify(arg)).join(', ');

/** Renders `table.uuid('id').notNullable()` as the string "uuid('id').notNullable()". */
function recordColumns(define: (table: object) => void) {
  const columns: string[] = [];
  const modifiers = (index: number): object => new Proxy({}, {
    get: (_target, prop) => (...args: unknown[]) => {
      columns[index] += `.${String(prop)}(${format(args)})`;
      return modifiers(index);
    },
  });
  define(new Proxy({}, {
    get: (_target, prop) => (...args: unknown[]) => {
      columns.push(`${String(prop)}(${format(args)})`);
      return modifiers(columns.length - 1);
    },
  }));
  return columns;
}

/** A knex stand-in that records schema operations in order. */
function createFakeKnex(tables: Record<string, Record<string, unknown>[]> = {}) {
  const operations: unknown[][] = [];
  const inserts: unknown[][] = [];
  const schema = {
    hasTable: async () => false,
    createTable: async (name: string, define: (table: object) => void) => {
      operations.push(['create', name, recordColumns(define)]);
    },
    dropTableIfExists: (name: string) => {
      operations.push(['drop', name]);
      return schema;
    },
    renameTable: (from: string, to: string) => {
      operations.push(['rename', from, to]);
      return schema;
    },
  };
  const knex = Object.assign(
    (table: string) => ({
      then: (resolve: (rows: unknown) => unknown) => Promise.resolve(tables[table] ?? []).then(resolve),
      insert: vi.fn(async (row: unknown) => void inserts.push([table, row])),
    }),
    { schema, fn: { now: () => 'now' } },
  );
  return { knex: knex as never, operations, inserts };
}

const created = (operations: unknown[][]) => operations.filter(([type]) => type === 'create').map(([, name]) => name);
const dropped = (operations: unknown[][]) => operations.filter(([type]) => type === 'drop').map(([, name]) => name);

describe.each([
  ['create_posts', createPosts, ['posts', 'posts_tags', 'tags']],
  ['create_users', createUsers, ['users', 'users_login', 'users_session']],
  ['create_links', createLinks, ['links']],
  ['create_users_tags', createUsersTags, ['users_tags']],
  ['create_posts_comments', createPostsComments, ['posts_comments']],
])('%s', (_name, migration, tables) => {
  test('up creates its tables', async () => {
    const { knex, operations } = createFakeKnex();
    await migration.up(knex);
    expect(created(operations)).toEqual(tables);
  });

  test('down drops the same tables', async () => {
    const { knex, operations } = createFakeKnex();
    await migration.down(knex);
    expect(dropped(operations).sort()).toEqual([...tables].sort());
  });
});

describe('table definitions', () => {
  const columnsOf = async (migration: { up: (knex: never) => unknown }, table: string) => {
    const { knex, operations } = createFakeKnex();
    await migration.up(knex);
    return operations.find(([type, name]) => type === 'create' && name === table)?.[2];
  };

  test('posts', async () => {
    expect(await columnsOf(createPosts, 'posts')).toEqual([
      `uuid("id").notNullable()`,
      `uuid("owner").nullable()`,
      `enum("type", ["post","page"]).defaultTo("post")`,
      `enum("status", ["public","pending","moderated","deleted"]).defaultTo("public")`,
      `timestamp("created_at", {"useTz":false}).defaultTo("now")`,
    ]);
  });

  test('users have a primary key and a role', async () => {
    expect(await columnsOf(createUsers, 'users')).toEqual(expect.arrayContaining([
      `uuid("id").notNullable().primary()`,
      `enum("role", ["user","admin"]).defaultTo("user")`,
    ]));
  });

  test('links allow long urls', async () => {
    expect(await columnsOf(createLinks, 'links')).toContain(`string("url", 500).notNullable()`);
  });

  test('user tags default to liked', async () => {
    expect(await columnsOf(createUsersTags, 'users_tags')).toContain(`enum("type", ["liked","disliked"]).defaultTo("liked")`);
  });

  test('comments reference a post and default to public', async () => {
    expect(await columnsOf(createPostsComments, 'posts_comments')).toEqual(expect.arrayContaining([
      `uuid("post").notNullable()`,
      `enum("status", ["public","pending","moderated","deleted"]).defaultTo("public")`,
    ]));
  });
});

describe('alter_sessions', () => {
  const sessions = [
    { id: 's1', users_login_id: 'l1', status: 'active', secret: 'x', created_at: 1, extra: 'ignored' },
    { id: 's2', users_login_id: 'l2', status: 'pending', secret: 'y', created_at: 2 },
  ];

  test('up rebuilds the table with last_active, keeping the sessions', async () => {
    const { knex, operations, inserts } = createFakeKnex({ users_session_old: sessions });

    await alterSessions.up(knex);

    expect(operations.map(([type, ...rest]) => (type === 'create' ? [type, rest[0]] : [type, ...rest]))).toEqual([
      ['rename', 'users_session', 'users_session_old'],
      ['create', 'users_session'],
      ['drop', 'users_session_old'],
    ]);
    expect(operations[1][2]).toContain(`timestamp("last_active", {"useTz":false}).nullable()`);
    expect(inserts).toEqual([
      ['users_session', { id: 's1', users_login_id: 'l1', status: 'active', secret: 'x', created_at: 1 }],
      ['users_session', { id: 's2', users_login_id: 'l2', status: 'pending', secret: 'y', created_at: 2 }],
    ]);
  });

  test('down restores the original table without last_active', async () => {
    const { knex, operations, inserts } = createFakeKnex({ users_session_new: sessions });

    await alterSessions.down(knex);

    expect(operations.map(([type, ...rest]) => (type === 'create' ? [type, rest[0]] : [type, ...rest]))).toEqual([
      ['rename', 'users_session', 'users_session_new'],
      ['create', 'users_session'],
      ['drop', 'users_session_new'],
    ]);
    expect(operations[1][2]).toEqual(expect.not.arrayContaining([expect.stringContaining('last_active')]));
    expect(operations[1][2]).toContain(`enum("status", ["active","pending"]).defaultTo("pending")`);
    expect(inserts).toHaveLength(2);
  });
});
