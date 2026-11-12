import { TagsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRow } from '../../../utils/validateRows';

async function getById(id: string) {
  const knex = await createDatabase();

  return parseRow(TagsSchema, await knex('tags').select('id', 'name', 'type').where('id', id).first());
}

export default getById;
