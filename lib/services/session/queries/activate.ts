import { UsersSessionSchema } from '../../../data-schemas';
import { TimestampSchema } from '../../../utils/validateRows';
import createDatabase from '../../../utils/createDatabase';
import { toSqliteTimestamp } from '../../../utils/sessionLifetime';

const schema = UsersSessionSchema.pick({ id: true, status: true, secret: true, last_active: true }).extend({ created_at: TimestampSchema });

/** Activates a pending session under a fresh id (so the id from the email link is never the cookie) and restarts its lifetime. The first activation marks the login verified. */
async function activate(id: string, newId: string) {
  const knex = await createDatabase();

  const updated = await knex('users_session')
    .where({ id, status: 'pending' })
    .update(schema.parse({ id: newId, status: 'active', secret: '', created_at: toSqliteTimestamp(Date.now()), last_active: Date.now() }));

  if (updated > 0) {
    // Remembered on the login so the account stays verified after its sessions are purged.
    await knex.raw(
      'UPDATE users_login SET verified_at = COALESCE(verified_at, ?) WHERE id = (SELECT users_login_id FROM users_session WHERE id = ?)',
      [Date.now(), newId],
    );
  }

  return updated;
}
export default activate;
