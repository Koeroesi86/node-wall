import { LinksSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRow, TimestampSchema } from '../../../utils/validateRows';

const schema = LinksSchema.pick({ id: true }).extend({ created_at: TimestampSchema });

export default async function(url: string) {
  const knex = await createDatabase();

  return parseRow(schema, await knex('links').select('id', 'created_at').where('url', url).first());
};
