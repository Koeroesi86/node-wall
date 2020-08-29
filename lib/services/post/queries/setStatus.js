const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} id
 * @param {string} status
 * @returns {Promise<void>}
 */
async function setStatus(id, status) {
  const knex = await createDatabase();

  await knex('posts').where({ id }).update({ status });
}

module.exports = setStatus;
