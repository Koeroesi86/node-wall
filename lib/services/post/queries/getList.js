const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} status
 * @param {Number} [before]
 * @param {Number} [since]
 * @param {string[]} likedTags
 * @param {string[]} dislikedTags
 * @returns {Promise<*>}
 */
async function getList(status, before = null, since = null, likedTags, dislikedTags) {
  const knex = await createDatabase();

  const postsPromise = knex('posts')
    .select('id', 'owner', 'type', 'created_at')
    .orderBy('created_at', 'desc')
    .groupBy('posts.id')
    .where('status', status);

    if (before) {
      postsPromise.where('created_at', '<', before);
    }

    if (since) {
      postsPromise.where('created_at', '>=', since);
    }

    if (likedTags && likedTags.length > 0) {
      postsPromise.havingExists(function () {
        this.select('*').from('posts_tags')
          .whereRaw('posts.id = posts_tags.post_id')
          .whereIn('tag_id', likedTags);
      });
    }

    if (dislikedTags && dislikedTags.length > 0) {
      postsPromise.havingNotExists(function () {
        this.select('*').from('posts_tags')
          .whereRaw('posts.id = posts_tags.post_id')
          .whereIn('tag_id', dislikedTags);
      });
    }

  return postsPromise;
}

module.exports = getList;
