
exports.up = function(knex) {
  return knex.schema.createTable('book', function(table) {
    table.increments();
    table.string('name');
    table.integer('user_id')
    table.boolean('deleted');
    table.specificType('created_at', 'DATETIME(3)').defaultTo(knex.raw('CURRENT_TIMESTAMP(3)'))
    table.specificType('updated_at', 'DATETIME(3)').defaultTo(knex.raw('CURRENT_TIMESTAMP(3)'))
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('book');
}
