import { TagsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRows } from '../../../utils/validateRows';

export const TAGS_LIST_LIMIT = 100;

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

  return parseRows(TagsSchema, await tagsPromise.limit(TAGS_LIST_LIMIT));
}

export default getList;
