
exports.up = knex => {
  return knex.schema
    .createTableIfNotExists('posts', table => {
      table.uuid('id').notNullable();
      table.uuid('owner').nullable();
      table.enum('type', ['post', 'page']).defaultTo('post');
      table.enum('status', ['public', 'pending', 'moderated', 'deleted']).defaultTo('public');
      table.timestamp('created_at', { useTz: false }).defaultTo(knex.fn.now());
    })
    .createTableIfNotExists('posts_tags', table => {
      table.uuid('post_id').notNullable();
      table.uuid('tag_id').notNullable();
    })
    .createTableIfNotExists('tags', table => {
      table.uuid('id').notNullable();
      table.string('name').notNullable();
      table.enum('type', ['text', 'location']).defaultTo('text');
    })
};

exports.down = knex => {
  return knex.schema
    .dropTableIfExists('posts')
    .dropTableIfExists('posts_tags')
    .dropTableIfExists('tags')
};
