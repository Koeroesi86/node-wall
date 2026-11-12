import createDatabase from '../../../utils/createDatabase';

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

export default getList;
