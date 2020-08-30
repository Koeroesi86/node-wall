const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} id
 * @param {string} userId
 * @param {string} value
 * @param {string} [type]
 * @returns {Promise<*>}
 */
async function addLogin(id, userId, value, type = 'email') {
  const knex = await createDatabase();

  const login = { id, user_id: userId, type, value, };

  await knex.insert(login).into('users_login');
}

module.exports = addLogin;
