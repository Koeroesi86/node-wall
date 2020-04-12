const createDatabase = require('./createDatabase');

module.exports = async userId => {
  try {
    const knex = await createDatabase();

    const result = await knex.select([
      'users.id as userId',
      'users_login.type as loginType',
      'users_session.status as sessionStatus',
      'users_session.created_at as sessionCreatedAt',
      'users_session.id as sessionId',
      'users_session.last_active as lastActive'
    ])
      .from('users')
      .where({
        'users.id': userId,
    })
      .leftJoin('users_login', 'users.id', 'users_login.user_id')
      .leftJoin('users_session', 'users_login.id', 'users_session.users_login_id');

    return result;
  } catch (e) {
    return null;
  }
};
