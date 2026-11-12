import createDatabase from '../../../utils/createDatabase';
import { SESSION_IDLE_TIMEOUT_MS, SESSION_MAX_AGE_MS, toSqliteTimestamp } from '../../../utils/sessionLifetime';

/** Marks active sessions past their absolute lifetime or idle timeout as deleted. */
async function expireStale(now = Date.now()) {
  const knex = await createDatabase();

  await knex.raw(
    `UPDATE users_session SET status = 'deleted', secret = ''
     WHERE status = 'active'
       AND (created_at < ? OR COALESCE(last_active, CAST(strftime('%s', created_at) AS INTEGER) * 1000) < ?)`,
    [toSqliteTimestamp(now - SESSION_MAX_AGE_MS), now - SESSION_IDLE_TIMEOUT_MS],
  );
}
export default expireStale;
