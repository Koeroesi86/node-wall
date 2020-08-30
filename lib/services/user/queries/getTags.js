const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} id
 * @returns {Promise<*>}
 */
async function getTags(id) {
  const knex = await createDatabase();

  return knex('users_tags')
    .select('tag_id', 'type')
    .where({ user_id: id });
}
module.exports = getTags;
