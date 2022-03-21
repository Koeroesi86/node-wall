const { v4: uuid } = require('uuid');
const create = require('./queries/create');
const getById = require('./queries/getById');
const addLogin = require("./queries/addLogin");
const getLogin = require("./queries/getLogin");
const setName = require("./queries/setName");
const getTags = require("./queries/getTags");
const addTag = require("./queries/addTag");
const removeTag = require("./queries/removeTag");

module.exports = {
  /**
   * @param {string} id
   * @returns {Promise<*>}
   */
  get: async (id) => getById(id),
  /**
   * @param {string} [name]
   * @returns {Promise<*>}
   */
  create: async (name) => {
    const id = uuid();
    const role = 'admin'; //should be 'user'

    await create(id, name || null, role);

    return { id, name, role };
  },
  /**
   * @param {string} userId
   * @param {string} value
   * @param {string} type
   * @returns {Promise<*>}
   */
  addLogin: async (userId, value, type = 'email') => {
    const id = uuid();

    await addLogin(id, userId, value, type);

    return { id, userId, value, type };
  },
  /**
   * @param {string} type
   * @param {string} value
   * @returns {Promise<*>}
   */
  getLogin: async (type, value) => getLogin(type, value),
  /**
   * @param {string} id
   * @param {string} name
   * @returns {Promise<void>}
   */
  setName: async (id, name) => setName(id, name),
  /**
   * @param {string} id
   * @returns {Promise<*>}
   */
  getTags: async (id) => getTags(id),
  /**
   * @param tagId
   * @param userId
   * @param type
   * @returns {Promise<*>}
   */
  addTag: async (tagId, userId, type) => addTag(tagId, userId, type),
  /**
   * @param {string} tagId
   * @param {string} userId
   * @returns {Promise<*>}
   */
  removeTag: async (tagId, userId) => removeTag(tagId, userId),
};
