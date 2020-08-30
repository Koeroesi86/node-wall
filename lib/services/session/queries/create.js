const createDatabase = require("lib/utils/createDatabase");

/**
 * @param id
 * @param loginId
 * @param secret
 * @param status
 * @returns {Promise<*>}
 */
async function create(id, loginId, secret, status = 'pending') {
  const knex = await createDatabase();

  await knex.insert({
    id,
    users_login_id: loginId,
    secret,
    status,
  }).into('users_session');
}
module.exports = create;
