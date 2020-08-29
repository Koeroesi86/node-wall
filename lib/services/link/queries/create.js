const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} id
 * @param {string} url
 * @returns {Promise<void>}
 */
module.exports = async function(id, url) {
  const knex = await createDatabase();

  await knex.insert({ id, url }).into('links');
};
