import type { Knex } from 'knex';
import createTableIfMissing from '../lib/utils/createTableIfMissing.ts';

export const up = async (knex: Knex) => {
  await createTableIfMissing(knex, 'users_tags', table => {
    table.uuid('user_id').notNullable();
    table.uuid('tag_id').notNullable();
    table.enum('type', ['liked', 'disliked']).defaultTo('liked');
  });
};

export const down = (knex: Knex) => {
  return knex.schema
    .dropTableIfExists('users_tags');
};
