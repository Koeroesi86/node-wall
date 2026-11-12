import { UsersSessionSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

const schema = UsersSessionSchema.pick({ id: true, users_login_id: true, secret: true, status: true });

async function create(id: string, loginId: string, secret: string, status = 'pending') {
  const knex = await createDatabase();

  await knex.insert(schema.parse({
    id,
    users_login_id: loginId,
    secret,
    status,
  })).into('users_session');
}
export default create;
