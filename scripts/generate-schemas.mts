import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import Knex from 'knex';
import { isApplicationTable, renderIndex, renderSchema, schemaFileName, type ColumnInfo } from '../lib/utils/generateSchemas.ts';

const OUTPUT_DIR = 'lib/data-schemas';
const MIGRATIONS_DIR = resolve('migrations');

// Migrates an in-memory sqlite database from the TypeScript migrations, so no .env, build or existing database is needed.
const knex = Knex({
  client: 'sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true, pool: { min: 1, max: 1 },
});

const migrationSource = {
  getMigrations: async () => readdirSync(MIGRATIONS_DIR).filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts')).sort(),
  getMigrationName: (migration: string) => migration,
  getMigration: (migration: string) => import(join(MIGRATIONS_DIR, migration)),
};

try {
  await knex.migrate.latest({ migrationSource });
  const rows: { name: string }[] = await knex('sqlite_master').where({ type: 'table' }).orderBy('name').select('name');
  const tables = rows.map(row => row.name).filter(isApplicationTable);

  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });

  await Promise.all(tables.map(async (table) => {
    const columns: ColumnInfo[] = await knex.raw('SELECT name, type, "notnull" FROM pragma_table_info(?)', [table]);
    writeFileSync(join(OUTPUT_DIR, schemaFileName(table)), renderSchema(table, columns));
  }));
  writeFileSync(join(OUTPUT_DIR, 'index.ts'), renderIndex(tables));
  console.log(`Generated ${tables.length} schemas in ${OUTPUT_DIR}`);
} finally {
  await knex.destroy();
}
