const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} type
 * @param {string} value
 * @returns {Promise<*>}
 */
async function getLogin(type, value) {
  const knex = await createDatabase();

  return knex
    .select('id', 'user_id')
    .where({ type, value })
    .from('users_login')
    .first();
}
module.exports = getLogin;
