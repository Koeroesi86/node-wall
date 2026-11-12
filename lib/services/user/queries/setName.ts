import createDatabase from '../../../utils/createDatabase';

async function setName(id: string, name: string) {
  const knex = await createDatabase();

  await knex('users')
    .update({ name })
    .where({ id });
}

export default setName;
