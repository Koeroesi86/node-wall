import createDatabase from '../../../utils/createDatabase';
import { toSqliteTimestamp } from '../../../utils/sessionLifetime';

/** Activates a pending session under a fresh id (so the id from the email link is never the cookie) and restarts its lifetime. */
async function activate(id: string, newId: string) {
  const knex = await createDatabase();

  return knex('users_session')
    .where({ id, status: 'pending' })
    .update({ id: newId, status: 'active', secret: '', created_at: toSqliteTimestamp(Date.now()), last_active: Date.now() });
}
export default activate;
