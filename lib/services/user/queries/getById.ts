import { UsersSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRow, TimestampSchema } from '../../../utils/validateRows';

const schema = UsersSchema.pick({ name: true, id: true, role: true }).extend({ created_at: TimestampSchema });

export default async function(id: string) {
  const knex = await createDatabase();

  return parseRow(schema, await knex('users').select('name', 'id', 'role', 'created_at').where('id', id).first());
};
