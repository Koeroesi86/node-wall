const uuid = require("uuid/v4");
const storage = require("lib/services/storage");
const getPost = require("./queries/getPost");
const getPostTags = require("./queries/getTags");
const getPostComments = require("./queries/getComments");
const createPostComment = require("./queries/createComment");
const setStatus = require("./queries/setStatus");
const getBounds = require("./queries/getBounds");
const getList = require("./queries/getList");
const getNextPage = require("./queries/getNextPage");
const create = require("./queries/create");
const addTag = require("./queries/addTag");
const removeTag = require("./queries/removeTag");

module.exports = {
  create: async (body, owner, type = 'post') => {
    const id = uuid();

    let content = body;
    content = content.trim();
    content = content.replace(/\n{3,}/gi, '\n\n');
    content = content.replace(/&nbsp;/gi, ' ');
    content = content.replace(/<[^>]*>/g, ''); //strip html

    await storage.write(id, type, content);
    await create(id, owner);
  },
  /**
   * @param {string} postId
   * @returns {Promise<*>}
   */
  get: async (postId) => {
    return getPost(postId);
  },
  /**
   * @param {string} postId
   * @returns {Promise<*>}
   */
  getTags: async (postId) => {
    return getPostTags(postId);
  },
  /**
   * @param {string} postId
   * @param {string} [status]
   * @returns {Promise<*>}
   */
  getComments: async (postId, status = 'public') => {
    return getPostComments(postId, status = 'public');
  },
  /**
   * @param {string} postId
   * @param {string} [parent]
   * @param {string} [owner]
   * @param {string} body
   * @returns {Promise<void>}
   */
  createComment: async (postId, parent, owner, body) => {
    const id = uuid();
    let content = body;

    content = content.trim();
    content = content.replace(/\n{3,}/gi, '\n\n');
    content = content.replace(/&nbsp;/gi, ' ');
    content = content.replace(/<[^>]*>/g, ''); //strip html

    await storage.write(id, 'comment', content);

    await createPostComment(id, postId, parent, owner);
  },
  /**
   * @param {string} id
   * @param {string} status
   */
  setStatus: async (id, status) => setStatus(id, status),
  /**
   * @param {string} id
   * @param {string} type
   * @returns {Promise<string>}
   */
  getContent: async (id, type = 'post') => storage.read(id, type),
  getBounds: async () => {
    return await getBounds() || { oldest: null, newest: null };
  },
  /**
   * @param {string} status
   * @param {Number} [before]
   * @param {Number} [since]
   * @param {string[]} likedTags
   * @param {string[]} dislikedTags
   * @returns {Promise<*>}
   */
  getList: async (status, before = null, since = null, likedTags, dislikedTags) => {
    return getList(status, before, since, likedTags, dislikedTags);
  },
  /**
   * @param {string} status
   * @param {Number} [before]
   * @param {Number} [since]
   * @param {string[]} likedTags
   * @param {string[]} dislikedTags
   * @returns {Promise<*>}
   */
  getNextPage: async (status, before = null, since = null, likedTags, dislikedTags) => {
    return getNextPage(status, before, since, likedTags, dislikedTags);
  },
  /**
   * @param {string} postId
   * @param {string} tagId
   * @returns {Promise<void>}
   */
  addTag: async (postId, tagId) => addTag(postId, tagId),
  /**
   * @param {string} postId
   * @param {string} tagId
   * @returns {Promise<void>}
   */
  removeTag: async (postId, tagId) => removeTag(postId, tagId),
};
