import createDatabase from '../../../utils/createDatabase';

async function getLogin(type: string, value: string) {
  const knex = await createDatabase();

  return knex
    .select('id', 'user_id')
    .where({ type, value })
    .from('users_login')
    .first();
}
export default getLogin;
