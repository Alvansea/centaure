
exports.up = function(knex) {
  return knex.schema.createTable('user', function(table) {
    table.increments();
    table.string('username').notNullable();
    table.boolean('deleted').notNullable().defaultTo(false);
    table.specificType('created_at', 'DATETIME(3)').defaultTo(knex.raw('CURRENT_TIMESTAMP(3)'))
    table.specificType('updated_at', 'DATETIME(3)').defaultTo(knex.raw('CURRENT_TIMESTAMP(3)'))
  })
};

exports.down = function(knex) {
  return knex.schema.dropTable('user');
};
