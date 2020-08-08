const createDatabase = require("./createDatabase");
const getData = require("./getData");

async function getComment(id) {
  const knex = await createDatabase();
  const comment = await knex('posts_comments')
    .where({
      id: id,
      status: 'public',
    })
    .select('*')
    .first();

  if (comment) {
    return {
      ...comment,
      body: await getData(id, 'comment'),
    }
  }

  throw new Error(`no comment with id ${id}`);
}

module.exports = getComment;
