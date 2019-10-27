
exports.up = knex => {
  return knex.schema
    .createTableIfNotExists('users_tags', table => {
      table.uuid('user_id').notNullable();
      table.uuid('tag_id').notNullable();
      table.enum('type', ['liked', 'disliked']).defaultTo('liked');
    });
};

exports.down = knex => {
  return knex.schema
    .dropTableIfExists('users_tags');
};
