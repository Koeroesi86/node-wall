const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} id
 * @returns {Promise<*>}
 */
module.exports = async function(id) {
  const knex = await createDatabase();

  return knex('users').select('name', 'id', 'role', 'created_at').where('id', id).first();
};
