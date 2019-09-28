const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({
  path: resolve(__dirname, './.env')
});

const { DB_DRIVER, DB_DATABASE } = process.env;
module.exports = {
  development: {
    client: DB_DRIVER,
    connection: {
      filename: DB_DATABASE
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },
};
