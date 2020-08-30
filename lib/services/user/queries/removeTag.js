const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} tagId
 * @param {string} userId
 * @returns {Promise<*>}
 */
async function removeTag(tagId, userId) {
  const knex = await createDatabase();

  await knex('users_tags')
    .delete()
    .where({
      tag_id: tagId,
      user_id: userId,
    });
}

module.exports = removeTag;
