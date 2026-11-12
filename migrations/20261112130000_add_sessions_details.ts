import type { Knex } from 'knex';

export const up = (knex: Knex) => knex.schema.alterTable('users_session', table => {
  table.string('user_agent').nullable();
  table.string('remote_address').nullable();
});

export const down = (knex: Knex) => knex.schema.alterTable('users_session', table => {
  table.dropColumn('user_agent');
  table.dropColumn('remote_address');
});
