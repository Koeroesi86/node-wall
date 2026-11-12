import createDatabase from '../../../utils/createDatabase';

async function setRole(id: string, role: string) {
  const knex = await createDatabase();

  await knex('users')
    .update({ role })
    .where({ id });
}

export default setRole;
