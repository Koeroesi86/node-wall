import type { Knex } from 'knex';

export const up = (knex: Knex) => knex.schema.createTable('contents', table => {
  table.string('type').notNullable();
  table.string('id').notNullable();
  table.text('body').notNullable();
  table.primary(['type', 'id']);
});

export const down = (knex: Knex) => knex.schema.dropTable('contents');
