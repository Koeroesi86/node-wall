import type { Knex } from 'knex';

/** Adds what admin actions need to be traceable. Nullable, so the existing account entries and old code keep working. */
export const up = async (knex: Knex) => {
  await knex.schema.alterTable('audit_log', table => {
    table.uuid('target_id').nullable();
    table.uuid('request_id').nullable();
  });
  await knex.schema.alterTable('audit_log', table => {
    table.index('created_at');
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.alterTable('audit_log', table => {
    table.dropIndex('created_at');
    table.dropColumn('request_id');
    table.dropColumn('target_id');
  });
};
