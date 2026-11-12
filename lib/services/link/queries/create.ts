import { LinksSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

const schema = LinksSchema.pick({ id: true, url: true });

export default async function(id: string, url: string) {
  const knex = await createDatabase();

  await knex.insert(schema.parse({ id, url })).into('links');
};
