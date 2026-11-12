import type { Knex } from 'knex';
import createTableIfMissing from '../lib/utils/createTableIfMissing.ts';

export const up = async (knex: Knex) => {
  await createTableIfMissing(knex, 'posts', table => {
    table.uuid('id').notNullable();
    table.uuid('owner').nullable();
    table.enum('type', ['post', 'page']).defaultTo('post');
    table.enum('status', ['public', 'pending', 'moderated', 'deleted']).defaultTo('public');
    table.timestamp('created_at', { useTz: false }).defaultTo(knex.fn.now());
  });
  await createTableIfMissing(knex, 'posts_tags', table => {
    table.uuid('post_id').notNullable();
    table.uuid('tag_id').notNullable();
  });
  await createTableIfMissing(knex, 'tags', table => {
    table.uuid('id').notNullable();
    table.string('name').notNullable();
    table.enum('type', ['text', 'location']).defaultTo('text');
  });
};

export const down = (knex: Knex) => {
  return knex.schema
    .dropTableIfExists('posts')
    .dropTableIfExists('posts_tags')
    .dropTableIfExists('tags')
};
