import type { Knex } from 'knex';

// Replaces the deprecated `schema.createTableIfNotExists`. Migrations import this with the .ts extension so scripts/generate-schemas.mts can load them directly.
const createTableIfMissing = async (knex: Knex, name: string, define: (table: Knex.CreateTableBuilder) => void) => {
  if (await knex.schema.hasTable(name)) return;
  await knex.schema.createTable(name, define);
};

export default createTableIfMissing;
