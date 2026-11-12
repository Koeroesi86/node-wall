import createDatabase from '../../../utils/createDatabase';

export default async function(url: string) {
  const knex = await createDatabase();

  return knex('links').select('id', 'created_at').where('url', url).first();
};
