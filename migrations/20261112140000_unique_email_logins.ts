import type { Knex } from 'knex';
import normalizeLogin from '../lib/utils/normalizeLogin.ts';

type LoginRow = { id: string; user_id: string; value: string };

/**
 * Lowercases email logins, merges logins that only differed by case into the one of the
 * oldest user (their sessions are repointed, the users themselves are kept) and only then
 * adds the unique index. Collisions are reported.
 */
export const up = async (knex: Knex) => {
  const rows: LoginRow[] = await knex('users_login').select('id', 'user_id', 'value').where({ type: 'email' });
  const users: { id: string; created_at: string }[] = await knex('users').select('id', 'created_at');
  const createdAt = new Map(users.map(user => [user.id, String(user.created_at)]));
  const groups = rows.reduce((acc, row) => {
    const value = normalizeLogin('email', row.value);
    return acc.set(value, [...(acc.get(value) ?? []), row]);
  }, new Map<string, LoginRow[]>());

  for (const [value, logins] of groups) {
    const [keep, ...duplicates] = logins.toSorted((a, b) => (createdAt.get(a.user_id) ?? '').localeCompare(createdAt.get(b.user_id) ?? ''));

    if (duplicates.length > 0) {
      console.warn(`merging ${logins.length} email logins that differ only by case (kept login ${keep.id})`);
      const ids = duplicates.map(duplicate => duplicate.id);
      await knex('users_session').whereIn('users_login_id', ids).update({ users_login_id: keep.id });
      await knex('users_login').whereIn('id', ids).delete();
    }
    if (keep.value !== value) {
      await knex('users_login').where({ id: keep.id }).update({ value });
    }
  }

  await knex.schema.alterTable('users_login', table => {
    table.unique(['type', 'value'], { indexName: 'users_login_type_value_unique' });
  });
};

// Merged logins cannot be split again; dropping the index is the only safe reversal.
export const down = (knex: Knex) => knex.schema.alterTable('users_login', table => {
  table.dropUnique(['type', 'value'], 'users_login_type_value_unique');
});
