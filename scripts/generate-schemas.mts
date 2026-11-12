import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Knex from 'knex';
import { isApplicationTable, renderIndex, renderSchema, schemaFileName, type ColumnInfo } from '../lib/utils/generateSchemas.ts';

const OUTPUT_DIR = 'lib/data-schemas';

// Run `npm run knex -- migrate:latest` first so the database is up to date.
if (existsSync('.env')) process.loadEnvFile('.env');

const { DB_DRIVER, DB_DATABASE } = process.env;
const knex = Knex({ client: DB_DRIVER, connection: { filename: DB_DATABASE ?? '' }, useNullAsDefault: true });

try {
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
