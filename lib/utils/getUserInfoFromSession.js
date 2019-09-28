const createDatabase = require('./createDatabase');

module.exports = async sessionId => {
  try {
    const knex = await createDatabase();
    const session = await knex.select('users_login_id', 'status', 'created_at').where({
      id: sessionId,
    }).from('users_session').first();
    if (!session) {
      throw new Error('no session');
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
