const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} postId
 * @param {string} tagId
 * @returns {Promise<void>}
 */
async function addTag(postId, tagId) {
  const knex = await createDatabase();

  await knex.insert({
    post_id: postId,
    tag_id: tagId,
  }).into('posts_tags');
}

module.exports = addTag;
