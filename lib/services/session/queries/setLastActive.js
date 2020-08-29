const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} sessionId
 * @param {number} lastActive
 * @returns {Promise<void>}
 */
module.exports = async function(sessionId, lastActive = Date.now()) {
  const knex = await createDatabase();

  await knex('users_session')
    .where({ id: sessionId })
    .update({ last_active: Date.now() })
};
