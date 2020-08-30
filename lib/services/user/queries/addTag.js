const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} tagId
 * @param {string} userId
 * @param {string} type
 * @returns {Promise<void>}
 */
async function addTag(tagId, userId, type) {
  const knex = await createDatabase();

  const condition = {
    tag_id: tagId,
    user_id: userId,
  };

  const existing = await knex('users_tags')
    .select('tag_id', 'type')
    .where(condition)
    .first();

  if (existing) {
    await knex('users_tags')
      .update({ type })
      .where(condition);
  } else {
    await knex('users_tags').insert({ ...condition, type });
  }
}

module.exports = addTag;
