import createDatabase from '../../../utils/createDatabase';

async function remove(id: string) {
  const knex = await createDatabase();

  await knex('users_session')
    .where({ id })
    .update({ status: 'deleted', secret: '' });
}
export default remove;
