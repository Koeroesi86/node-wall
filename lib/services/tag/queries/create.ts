import createDatabase from '../../../utils/createDatabase';

export default async function(id: string, name: string, type: string) {
  const knex = await createDatabase();

  await knex.insert({ id, name, type }).into('tags');
};
