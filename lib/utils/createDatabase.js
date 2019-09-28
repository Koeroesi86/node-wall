const Knex = require('knex');

let db;

/**
 * @returns {Promise<Knex>}
 */
function createDatabase() {
  if (db) {
    return Promise.resolve(db);
  }
  const { DB_DRIVER, DB_DATABASE } = process.env;
  const knex = Knex({
    client: DB_DRIVER,
    connection: {
      filename: DB_DATABASE
    },
    useNullAsDefault: true,
    pool: { min: 0, max: 1 }
  });
  return knex.migrate
    .latest()
    .then(() => knex);
}

module.exports = createDatabase;
