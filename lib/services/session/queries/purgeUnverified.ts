import createDatabase from '../../../utils/createDatabase';
import { PENDING_RETENTION_MS, toSqliteTimestamp } from '../../../utils/sessionLifetime';

/**
 * Deletes pending sessions older than the retention period, then the logins and users that never verified
 * (`verified_at` is set on first activation, so verified accounts survive their sessions being purged).
 */
async function purgeUnverified(now = Date.now()) {
  const knex = await createDatabase();
  const cutoff = toSqliteTimestamp(now - PENDING_RETENTION_MS);

  await knex.raw(`DELETE FROM users_session WHERE status = 'pending' AND created_at < ?`, [cutoff]);
  await knex.raw(
    `DELETE FROM users_login
     WHERE verified_at IS NULL AND id NOT IN (SELECT users_login_id FROM users_session)
       AND user_id IN (SELECT id FROM users WHERE created_at < ?)`,
    [cutoff],
  );
  await knex.raw(
    `DELETE FROM users WHERE created_at < ? AND id NOT IN (SELECT user_id FROM users_login)`,
    [cutoff],
  );
}
export default purgeUnverified;
