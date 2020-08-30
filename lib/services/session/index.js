const uuid = require("uuid/v4");
const setLastActive = require('./queries/setLastActive');
const create = require("./queries/create");
const remove = require("./queries/remove");

module.exports = {
  create: async (loginId, secret, status = 'pending') => {
    const id = uuid();

    await create(id, loginId, secret, status);

    return { id, status, secret, users_login_id: loginId };
  },
  /**
   * @param {string} sessionId
   * @param {number} lastActive
   * @returns {Promise<void>}
   */
  setLastActive: async (sessionId, lastActive) => {
    await setLastActive(sessionId, lastActive);
  },
  remove: async (id) => remove(id),
};
