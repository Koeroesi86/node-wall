const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} id
 * @param {string} postId
 * @param {string} [parent]
 * @param {string} [owner]
 * @returns {Promise<void>}
 */
async function createComment(id, postId, parent, owner) {
  const knex = await createDatabase();

  await knex.insert({
    id: id,
    post: postId,
    parent: parent,
    owner: owner,
    status: 'public', // TODO: approval?
  }).into('posts_comments');
}

module.exports = createComment;
