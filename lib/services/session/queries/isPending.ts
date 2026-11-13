import createDatabase from '../../../utils/createDatabase';

async function isPending(id: string) {
  const knex = await createDatabase();

  const session = await knex('users_session').where({ id, status: 'pending' }).first('id');

  return session !== undefined;
}
export default isPending;
