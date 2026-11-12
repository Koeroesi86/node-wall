import type { Knex } from 'knex';
import createTableIfMissing from '../lib/utils/createTableIfMissing.ts';

export const up = async (knex: Knex) => {
  await createTableIfMissing(knex, 'links', table => {
    table.uuid('id').notNullable();
    table.string('url', 500).notNullable();
    table.timestamp('created_at', { useTz: false }).defaultTo(knex.fn.now());
  });
};

export const down = (knex: Knex) => {
  return knex.schema
    .dropTableIfExists('links');
};
