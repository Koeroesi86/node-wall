const createDatabase = require("lib/utils/createDatabase");

async function getComment(id) {
  const knex = await createDatabase();

  return knex('posts_comments')
    .where({
      id: id,
      status: 'public',
    })
    .select('*')
    .first();
}

module.exports = getComment;
