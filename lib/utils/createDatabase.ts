import Knex, { type Knex as KnexInstance } from 'knex';

let db: Promise<KnexInstance> | undefined;

function connect(): Promise<KnexInstance> {
  const { DB_DRIVER, DB_DATABASE } = process.env;
  const knex = Knex({
    client: DB_DRIVER,
    connection: {
      filename: DB_DATABASE ?? ''
    },
    useNullAsDefault: true,
    pool: { min: 0, max: 1 }
  });

  return knex.migrate.latest().then(() => knex);
}

/** Callers that arrive while the migrations run share them, since two migrations on one sqlite file lock each other out. */
function createDatabase(): Promise<KnexInstance> {
  db ??= connect().catch((error) => {
    db = undefined;
    throw error;
  });

  return db;
}

export default createDatabase;
