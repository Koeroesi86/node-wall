const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} postId
 * @param {string} tagId
 * @returns {Promise<void>}
 */
async function removeTag(postId, tagId) {
  const knex = await createDatabase();

  await knex('posts_tags').where({ post_id: postId, tag_id: tagId }).delete();
}

module.exports = removeTag;
