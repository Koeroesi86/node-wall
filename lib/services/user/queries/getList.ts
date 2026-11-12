import { UsersSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRows, TimestampSchema } from '../../../utils/validateRows';

const schema = UsersSchema.pick({ id: true, name: true, role: true }).extend({ created_at: TimestampSchema });

async function getList() {
  const knex = await createDatabase();

  const rows = await knex('users')
    .select('id', 'name', 'role', 'created_at')
    .orderBy('created_at', 'desc');

  return parseRows(schema, rows);
}

export default getList;
