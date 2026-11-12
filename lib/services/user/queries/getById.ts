import createDatabase from '../../../utils/createDatabase';

export default async function(id: string) {
  const knex = await createDatabase();

  return knex('users').select('name', 'id', 'role', 'created_at').where('id', id).first();
};
