const getById = require('./queries/getById');

module.exports = {
  /**
   * @param {string} id
   * @returns {Promise<*>}
   */
  get: async (id) => getById(id)
};
