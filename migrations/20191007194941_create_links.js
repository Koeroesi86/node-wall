
exports.up = knex => {
  return knex.schema
    .createTableIfNotExists('links', table => {
      table.uuid('id').notNullable();
      table.string('url', 500).notNullable();
      table.timestamp('created_at', { useTz: false }).defaultTo(knex.fn.now());
    })
};

exports.down = knex => {
  return knex.schema
    .dropTableIfExists('links');
};
