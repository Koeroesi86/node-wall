import type { Knex } from 'knex';

export const up = (knex: Knex) => {
  return knex.schema
    .createTableIfNotExists('users_tags', table => {
      table.uuid('user_id').notNullable();
      table.uuid('tag_id').notNullable();
      table.enum('type', ['liked', 'disliked']).defaultTo('liked');
    });
};

export const down = (knex: Knex) => {
  return knex.schema
    .dropTableIfExists('users_tags');
};
