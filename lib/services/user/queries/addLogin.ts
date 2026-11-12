import createDatabase from '../../../utils/createDatabase';

async function addLogin(id: string, userId: string, value: string, type = 'email') {
  const knex = await createDatabase();

  const login = { id, user_id: userId, type, value, };

  await knex.insert(login).into('users_login');
}

export default addLogin;
