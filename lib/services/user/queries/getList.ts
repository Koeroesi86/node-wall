import createDatabase from '../../../utils/createDatabase';

async function getList() {
  const knex = await createDatabase();

  return knex('users')
    .select('id', 'name', 'role', 'created_at')
    .orderBy('created_at', 'desc');
}

export default getList;
