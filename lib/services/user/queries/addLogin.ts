import { UsersLoginSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import normalizeLogin from '../../../utils/normalizeLogin';

const schema = UsersLoginSchema.pick({ id: true, user_id: true, type: true, value: true });

async function addLogin(id: string, userId: string, value: string, type = 'email') {
  const knex = await createDatabase();

  const login = schema.parse({ id, user_id: userId, type, value: normalizeLogin(type, value) });

  await knex.insert(login).into('users_login');
}

export default addLogin;
