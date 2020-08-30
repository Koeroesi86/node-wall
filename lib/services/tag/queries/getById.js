const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} id
 * @returns {Promise<*>}
 */
async function getById(id) {
  const knex = await createDatabase();

  return knex('tags').select('id', 'name', 'type').where('id', id).first();
}

module.exports = getById;
