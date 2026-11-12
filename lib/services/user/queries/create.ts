import createDatabase from '../../../utils/createDatabase';

async function create(id: string, name: string | null, role = 'user') {
  const knex = await createDatabase();

  const user = { id,  name,  role };

  await knex.insert(user).into('users');
}

export default create;
