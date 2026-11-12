import Knex, { type Knex as KnexInstance } from 'knex';

let db: KnexInstance | undefined;

function createDatabase(): Promise<KnexInstance> {
  if (db) {
    return Promise.resolve(db);
  }
  const { DB_DRIVER, DB_DATABASE } = process.env;
  const knex = Knex({
    client: DB_DRIVER,
    connection: {
      filename: DB_DATABASE ?? ''
    },
    useNullAsDefault: true,
    pool: { min: 0, max: 1 }
  });
  return knex.migrate
    .latest()
    .then(() => {
      db = knex;
      return Promise.resolve(knex);
    });
}

export default createDatabase;
