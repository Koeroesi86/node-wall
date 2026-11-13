import createDatabase from '../../../utils/createDatabase';
import { DETAILS_RETENTION_MS, toSqliteTimestamp } from '../../../utils/sessionLifetime';

/**
 * Clears the user agent and remote address of sessions that ended (deleted) more than the retention period ago.
 * The row itself stays: verified accounts must keep a session row (see purgeUnverified). The end time is
 * approximated by the last activity, falling back to creation.
 */
async function scrubEndedDetails(now = Date.now()) {
  const knex = await createDatabase();

  await knex.raw(
    `UPDATE users_session SET user_agent = NULL, remote_address = NULL
     WHERE status = 'deleted'
       AND (user_agent IS NOT NULL OR remote_address IS NOT NULL)
       AND COALESCE(last_active, CAST(strftime('%s', created_at) AS INTEGER) * 1000) < ?`,
    [now - DETAILS_RETENTION_MS],
  );
}
export default scrubEndedDetails;
