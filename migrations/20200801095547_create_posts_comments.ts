import type { Knex } from 'knex';
import createTableIfMissing from '../lib/utils/createTableIfMissing.ts';

export const up = async (knex: Knex) => {
  await createTableIfMissing(knex, 'posts_comments', table => {
    table.uuid('id').notNullable();
    table.uuid('post').notNullable();
    table.uuid('parent').nullable();
    table.uuid('owner').nullable();
    table.enum('status', ['public', 'pending', 'moderated', 'deleted']).defaultTo('public');
    table.timestamp('created_at', { useTz: false }).defaultTo(knex.fn.now());
  });
};

export const down = (knex: Knex) => {
  return knex.schema
    .dropTableIfExists('posts_comments');
};
