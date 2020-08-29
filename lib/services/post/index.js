const uuid = require("uuid/v4");
const storage = require("lib/services/storage");
const getPost = require("./queries/getPost");
const getPostTags = require("./queries/getTags");
const getPostComments = require("./queries/getComments");
const createPostComment = require("./queries/createComment");

module.exports = {
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
  }
};
