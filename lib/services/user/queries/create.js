const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} id
 * @param {string} [name]
 * @param {string} [role]
 * @returns {Promise<*>}
 */
async function create(id, name, role = 'user') {
  const knex = await createDatabase();

  const user = { id,  name,  role };

  await knex.insert(user).into('users');
}

module.exports = create;
