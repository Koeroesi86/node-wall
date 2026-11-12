import createDatabase from '../../../utils/createDatabase';

export default async function(id: string, url: string) {
  const knex = await createDatabase();

  await knex.insert({ id, url }).into('links');
};
