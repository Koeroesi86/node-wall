const setLastActive = require('./queries/setLastActive');

module.exports = {
  /**
   * @param {string} sessionId
   * @param {number} lastActive
   * @returns {Promise<void>}
   */
  setLastActive: async (sessionId, lastActive) => {
    await setLastActive(sessionId, lastActive);
  },
};
