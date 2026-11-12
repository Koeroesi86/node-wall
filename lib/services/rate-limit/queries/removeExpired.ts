import createDatabase from '../../../utils/createDatabase';

async function removeExpired(now = Date.now()) {
  const knex = await createDatabase();

  await knex('rate_limits').where('reset_at', '<=', now).delete();
}
export default removeExpired;
