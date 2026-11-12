import createDatabase from './createDatabase';
import { isSessionExpired } from './sessionLifetime';

export default async (sessionId: string) => {
  try {
    const knex = await createDatabase();
    const session = await knex.select('id', 'users_login_id', 'status', 'created_at', 'last_active').where({
      id: sessionId,
      status: 'active',
    }).from('users_session').first();
    if (!session) {
      throw new Error('no session');
    }
    if (isSessionExpired(session)) {
      throw new Error('session expired');
    }

    const login = await knex.select('id', 'type', 'user_id', 'value').where({
      id: session.users_login_id,
    }).from('users_login').first();
    if (!login) {
      throw new Error('no login');
    }

    const user = await knex.select('id', 'name', 'role', 'created_at').where({
      id: login.user_id,
    }).from('users').first();
    if (!user) {
      throw new Error('no user');
    }

    return { session, login, user };
  } catch (e) {
    return null;
  }
};
