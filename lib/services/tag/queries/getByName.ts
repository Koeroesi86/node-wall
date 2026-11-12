import { TagsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRow } from '../../../utils/validateRows';

const schema = TagsSchema.pick({ id: true, type: true });

export default async function(name: string) {
  const knex = await createDatabase();

  return parseRow(schema, await knex('tags').select('id', 'type').where('name', name).first());
};
