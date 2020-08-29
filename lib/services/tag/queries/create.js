const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} id
 * @param {string} name
 * @param {string} type
 * @returns {Promise<void>}
 */
module.exports = async function(id, name, type) {
  const knex = await createDatabase();

  await knex.insert({ id, name, type }).into('tags');
};
