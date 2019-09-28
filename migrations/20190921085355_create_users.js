
exports.up = knex => {
  return knex.schema
    .createTableIfNotExists('users', table => {
      table.uuid('id').notNullable().primary();
      table.string('name').nullable();
      table.enum('role', ['user', 'admin']).defaultTo('user');
      table.timestamp('created_at', { useTz: false }).defaultTo(knex.fn.now());
    })
    .createTableIfNotExists('users_login', table => {
      table.uuid('id').notNullable();
      table.uuid('user_id').notNullable();
      table.enum('type', ['email', 'facebook', 'google']).defaultTo('email');
      table.uuid('value').notNullable();
    })
    .createTableIfNotExists('users_session', table => {
      table.uuid('id').notNullable();
      table.uuid('users_login_id').notNullable();
      table.enum('status', ['active', 'pending']).defaultTo('pending');
      table.string('secret').nullable();
      table.timestamp('created_at', { useTz: false }).defaultTo(knex.fn.now());
    })
};

exports.down = knex => {
  return knex.schema
    .dropTableIfExists('users')
    .dropTableIfExists('users_login')
    .dropTableIfExists('users_session')
};
