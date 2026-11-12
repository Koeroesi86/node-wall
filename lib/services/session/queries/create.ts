import createDatabase from '../../../utils/createDatabase';

async function create(id: string, loginId: string, secret: string, status = 'pending') {
  const knex = await createDatabase();

  await knex.insert({
    id,
    users_login_id: loginId,
    secret,
    status,
  }).into('users_session');
}
export default create;
