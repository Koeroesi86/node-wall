import createDatabase from '../../../utils/createDatabase';

/** Deletes entries created before the cutoff (epoch milliseconds). */
async function removeExpired(cutoff: number) {
  const knex = await createDatabase();

  await knex('audit_log').where('created_at', '<', cutoff).delete();
}
export default removeExpired;
