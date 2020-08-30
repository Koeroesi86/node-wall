const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} id
 * @returns {Promise<*>}
 */
async function remove(id) {
  const knex = await createDatabase();

  await knex('users_session')
    .where({ id })
    .update({ status: 'deleted', secret: '' });
}
module.exports = remove;
