import dotenv from 'dotenv';
import getEnvPath from './lib/utils/getEnvPath';

dotenv.config({
  path: getEnvPath()
});

const { DB_DRIVER, DB_DATABASE } = process.env;
export = {
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
