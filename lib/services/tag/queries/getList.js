const createDatabase = require("lib/utils/createDatabase");

/**
 * @param {string} [search]
 * @param {boolean} [exact]
 * @returns {Promise<*>}
 */
async function getList(search = '', exact = false) {
  const knex = await createDatabase();

  const tagsPromise = knex('tags').select('id', 'name', 'type');

  if (!!search) {
    if (!exact) {
      tagsPromise.where('name', 'like', `%${search}%`)
    } else {
      tagsPromise.where('name', search)
    }
  }

  return tagsPromise;
}

module.exports = getList;
