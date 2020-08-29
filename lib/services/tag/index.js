const create = require('./queries/create');
const getByName = require('./queries/getByName');

module.exports = {
  /**
   * @param {string} id
   * @param {string} name
   * @param {string} type
   * @returns {Promise<void>}
   */
  create: async (id, name, type) => create(id, name, type),
  /**
   * @param {string} name
   * @returns {Promise<*>}
   */
  getByName: async (name) => getByName(name),
};
