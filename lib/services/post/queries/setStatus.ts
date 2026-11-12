import createDatabase from '../../../utils/createDatabase';

async function setStatus(id: string, status: string) {
  const knex = await createDatabase();

  await knex('posts').where({ id }).update({ status });
}

export default setStatus;
