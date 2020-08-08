const createDatabase = require("./createDatabase");

async function getPostComments(postId, status = 'public') {
  const knex = await createDatabase();
  return knex('posts_comments')
    .where({
      post: postId,
      status: status,
    })
    .select('id', 'parent', 'owner', 'created_at');
}

module.exports = getPostComments;
