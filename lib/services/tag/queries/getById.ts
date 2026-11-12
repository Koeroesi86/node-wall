import createDatabase from '../../../utils/createDatabase';

async function getById(id: string) {
  const knex = await createDatabase();

  return knex('tags').select('id', 'name', 'type').where('id', id).first();
}

export default getById;
