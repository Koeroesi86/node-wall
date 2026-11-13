import createDatabase from '../../../utils/createDatabase';
import { DELETED_RETENTION_MS } from '../../../utils/sessionLifetime';

/** Deletes sessions that ended (deleted) more than the retention period ago; the end is approximated by last activity, falling back to creation. */
async function purgeDeleted(now = Date.now()) {
  const knex = await createDatabase();

  await knex.raw(
    `DELETE FROM users_session
     WHERE status = 'deleted'
       AND COALESCE(last_active, CAST(strftime('%s', created_at) AS INTEGER) * 1000) < ?`,
    [now - DELETED_RETENTION_MS],
  );
}
export default purgeDeleted;
