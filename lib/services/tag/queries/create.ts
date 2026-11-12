import { TagsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';



export default async function(id: string, name: string, type: string) {
  const knex = await createDatabase();

  await knex.insert(TagsSchema.parse({ id, name, type })).into('tags');
};
