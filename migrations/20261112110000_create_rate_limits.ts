import type { Knex } from 'knex';

export const up = (knex: Knex) => knex.schema.createTable('rate_limits', table => {
  table.string('key').primary();
  table.integer('count').notNullable().defaultTo(0);
  table.bigInteger('reset_at').notNullable();
});

export const down = (knex: Knex) => knex.schema.dropTable('rate_limits');
