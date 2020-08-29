const createDatabase = require("lib/utils/createDatabase");

async function getComments(postId, status = 'public') {
  const knex = await createDatabase();

  return knex('posts_comments')
    .where({
      post: postId,
      status: status,
    })
    .select('id', 'parent', 'owner', 'created_at');
}

module.exports = getComments;
