const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} status
 * @param {Number} [before]
 * @param {Number} [since]
 * @param {string[]} likedTags
 * @param {string[]} dislikedTags
 * @returns {Promise<*>}
 */
async function getNextPage(status, before = null, since = null, likedTags, dislikedTags) {
  const knex = await createDatabase();

  const nextPageBeforePromise = knex('posts').max('created_at', { as: 'nextPageBefore' }).groupBy('posts.id');
  nextPageBeforePromise.where('status', status);

  if (since) {
    nextPageBeforePromise.where('created_at', '<', since);
  }

  if (likedTags.length > 0) {
    nextPageBeforePromise.havingExists(function () {
      this.select('*').from('posts_tags')
        .whereRaw('posts.id = posts_tags.post_id')
        .whereIn('tag_id', likedTags);
    });
  }

  if (dislikedTags.length > 0) {
    nextPageBeforePromise.havingNotExists(function () {
      this.select('*').from('posts_tags')
        .whereRaw('posts.id = posts_tags.post_id')
        .whereIn('tag_id', dislikedTags);
    });
  }

  return nextPageBeforePromise.first();
}

module.exports = getNextPage;
