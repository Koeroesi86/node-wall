
exports.up = knex => {
  return knex.schema
    .createTableIfNotExists('posts_comments', table => {
      table.uuid('id').notNullable();
      table.uuid('post').notNullable();
      table.uuid('parent').nullable();
      table.uuid('owner').nullable();
      table.enum('status', ['public', 'pending', 'moderated', 'deleted']).defaultTo('public');
      table.timestamp('created_at', { useTz: false }).defaultTo(knex.fn.now());
    });
};

exports.down = knex => {
  return knex.schema
    .dropTableIfExists('posts_comments');
};
