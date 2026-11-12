import { UsersLoginSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import normalizeLogin from '../../../utils/normalizeLogin';
import { parseRow } from '../../../utils/validateRows';

const schema = UsersLoginSchema.pick({ id: true, user_id: true });

async function getLogin(type: string, value: string) {
  const knex = await createDatabase();

  const row = await knex
    .select('id', 'user_id')
    .where({ type, value: normalizeLogin(type, value) })
    .from('users_login')
    .first();

  return parseRow(schema, row);
}
export default getLogin;
