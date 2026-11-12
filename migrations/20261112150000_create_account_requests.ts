import type { Knex } from 'knex';

export const up = async (knex: Knex) => {
  await knex.schema.createTable('account_confirmations', table => {
    table.uuid('user_id').primary();
    table.string('secret').notNullable();
    table.integer('attempts').notNullable().defaultTo(0);
    table.bigInteger('created_at').notNullable();
  });
  await knex.schema.createTable('audit_log', table => {
    table.uuid('id').primary();
    table.uuid('user_id').nullable();
    table.string('action').notNullable();
    table.bigInteger('created_at').notNullable();
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.dropTable('audit_log');
  await knex.schema.dropTable('account_confirmations');
};
