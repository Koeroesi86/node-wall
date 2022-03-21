const { v4: uuid } = require('uuid');
const create = require('./queries/create');
const getById = require('./queries/getById');
const getByName = require('./queries/getByName');
const getList = require("./queries/getList");

module.exports = {
  /**
   * @param {string} name
   * @param {string} type
   * @returns {Promise<*>}
   */
  create: async (name, type) => {
    const id = uuid();

    await create(id, name, type);

    return { id, name, type };
  },
  /**
   * @param {string} id
   * @returns {Promise<*>}
   */
  get: async (id) => getById(id),
  /**
   * @param {string} name
   * @returns {Promise<*>}
   */
  getByName: async (name) => getByName(name),
  /**
   * @param {string} [search]
   * @param {boolean} [exact]
   * @returns {Promise<*>}
   */
  getList: async (search = '', exact = false) => getList(search, exact),
};
