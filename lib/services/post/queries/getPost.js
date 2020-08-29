const createDatabase = require("lib/utils/createDatabase");

async function getPost(postId) {
  const knex = await createDatabase();

  return knex('posts')
    .select('id', 'owner', 'created_at', 'status', 'type')
    .where('id', postId)
    .first();
}

module.exports = getPost;
