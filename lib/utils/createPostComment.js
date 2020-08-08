const uuid = require('uuid/v4');
const createDatabase = require("./createDatabase");
const setData = require("./setData");

/**
 * @param {string} postId
 * @param {string} [parent]
 * @param {string} [owner]
 * @param {string} body
 * @returns {Promise<void>}
 */
async function createPostComment(postId, parent, owner, body) {
  const id = uuid();
  const knex = await createDatabase();

  let content = body;
  content = content.trim();
  content = content.replace(/\n{3,}/gi, '\n\n');
  content = content.replace(/&nbsp;/gi, ' ');
  content = content.replace(/<[^>]*>/g, ''); //strip html
  await setData(id, 'comment', content);

  await knex.insert({
    id: id,
    post: postId,
    parent: parent,
    owner: owner,
    status: 'public', // TODO: approval?
  }).into('posts_comments');
}

module.exports = createPostComment;
