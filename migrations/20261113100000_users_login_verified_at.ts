import type { Knex } from 'knex';

export const up = async (knex: Knex) => {
  await knex.schema.alterTable('users_login', table => {
    table.bigInteger('verified_at').nullable();
  });
  // Logins that already have (or had) an activated session are verified.
  await knex.raw(
    `UPDATE users_login SET verified_at = ?
     WHERE id IN (SELECT users_login_id FROM users_session WHERE status IN ('active', 'deleted'))`,
    [Date.now()],
  );
};

export const down = (knex: Knex) => knex.schema.alterTable('users_login', table => {
  table.dropColumn('verified_at');
});
