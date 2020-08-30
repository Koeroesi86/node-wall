const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} id
 * @param {string} name
 * @returns {Promise<void>}
 */
async function setName(id, name) {
  const knex = await createDatabase();

  await knex('users')
    .update({ name })
    .where({ id });
}

module.exports = setName;
