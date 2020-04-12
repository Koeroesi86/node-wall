
exports.up = knex => {
  return Promise.resolve()
    .then(() => knex.schema.renameTable('users_session', 'users_session_old'))
    .then(() => knex.schema.createTableIfNotExists('users_session', table => {
      table.uuid('id').notNullable();
      table.uuid('users_login_id').notNullable();
      table.string('status', 10).defaultTo('pending');
      table.string('secret').nullable();
      table.timestamp('created_at', { useTz: false }).defaultTo(knex.fn.now());
      table.timestamp('last_active', { useTz: false }).nullable();
    }))
    .then(async () => {
      const sessions = await knex('users_session_old');
      await Promise.all(sessions.map(async session => {
        await knex('users_session').insert({
          id: session.id,
          users_login_id: session.users_login_id,
          status: session.status,
          secret: session.secret,
          created_at: session.created_at,
        });
      }));
    })
    .then(() => knex.schema.dropTableIfExists('users_session_old'));
};

exports.down = knex => {
  return Promise.resolve()
    .then(() => knex.schema.renameTable('users_session', 'users_session_new'))
    .then(() => knex.createTableIfNotExists('users_session', table => {
      table.uuid('id').notNullable();
      table.uuid('users_login_id').notNullable();
      table.enum('status', ['active', 'pending']).defaultTo('pending');
      table.string('secret').nullable();
      table.timestamp('created_at', { useTz: false }).defaultTo(knex.fn.now());
    }))
    .then(async () => {
      const sessions = await knex('users_session_new');
      await Promise.all(sessions.map(async session => {
        await knex('users_session').insert({
          id: session.id,
          users_login_id: session.users_login_id,
          status: session.status,
          secret: session.secret,
          created_at: session.created_at,
        });
      }));
    })
    .then(() => knex.schema.dropTableIfExists('users_session_new'));
};
