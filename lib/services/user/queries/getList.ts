import { UsersSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRows, TimestampSchema } from '../../../utils/validateRows';

const schema = UsersSchema.pick({ id: true, name: true, role: true }).extend({ created_at: TimestampSchema });

export const USERS_LIST_LIMIT = 200;

async function getList() {
  const knex = await createDatabase();

  const rows = await knex('users')
    .select('id', 'name', 'role', 'created_at')
    .orderBy('created_at', 'desc')
    .limit(USERS_LIST_LIMIT);

  return parseRows(schema, rows);
}

export default getList;
