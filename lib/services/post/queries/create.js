const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} id
 * @param {string} [owner]
 * @param {string} [status]
 * @param {string} [type]
 * @returns {Promise<void>}
 */
async function create(id, owner, status = 'pending', type = 'post') {
  const knex = await createDatabase();

  await knex.insert({
    id,
    type,
    status,
    owner,
    created_at: Date.now(),
  }).into('posts');
}

module.exports = create;
