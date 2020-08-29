const createDatabase = require("lib/utils/createDatabase");

/**
 * @returns {Promise<*>}
 */
async function getBounds() {
  const knex = await createDatabase();

  return knex('posts')
    .where('status', 'public')
    .min('created_at as oldest')
    .max('created_at as newest')
    .first();
}

module.exports = getBounds;
