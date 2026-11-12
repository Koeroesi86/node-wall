import type { Knex } from 'knex';

export const up = (knex: Knex) => knex.schema.alterTable('users_session', table => {
  table.integer('attempts').notNullable().defaultTo(0);
});

export const down = (knex: Knex) => knex.schema.alterTable('users_session', table => {
  table.dropColumn('attempts');
});
