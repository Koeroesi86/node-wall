const createDatabase = require("lib/utils/createDatabase");

async function getTags(postId) {
  const knex = await createDatabase();

  return knex('posts_tags')
    .leftJoin('tags', 'tags.id', 'posts_tags.tag_id')
    .where('posts_tags.post_id', postId)
    .select('tags.id', 'tags.name', 'tags.type');
}

module.exports = getTags;
