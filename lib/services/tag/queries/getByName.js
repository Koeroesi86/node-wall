const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} name
 * @returns {Promise<*>}
 */
module.exports = async function(name) {
  const knex = await createDatabase();

  return knex('tags').select('id', 'type').where('name', name).first();
};
