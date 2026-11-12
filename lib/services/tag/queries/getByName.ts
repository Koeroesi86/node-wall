import createDatabase from '../../../utils/createDatabase';

export default async function(name: string) {
  const knex = await createDatabase();

  return knex('tags').select('id', 'type').where('name', name).first();
};
