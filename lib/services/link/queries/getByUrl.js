const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} url
 * @returns {Promise<*>}
 */
module.exports = async function(url) {
  const knex = await createDatabase();

  return knex('links').select('id', 'created_at').where('url', url).first();
};
