/**
 * Initial database schema for Nostr relay
 */
exports.up = function(knex) {
  return knex.schema.createTable('events', table => {
    table.increments('id').primary();
    table.text('event_id').notNullable().unique().index();
    table.text('pubkey').notNullable().index();
    table.bigInteger('created_at').notNullable().index();
    table.integer('kind').notNullable().index();
    table.jsonb('tags').notNullable().defaultTo('[]');
    table.text('content').notNullable();
    table.text('sig').notNullable();
    table.boolean('deleted').notNullable().defaultTo(false).index();
    
    // Composite indexes for efficient querying
    table.index(['pubkey', 'kind']);
    table.index(['kind', 'created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('events');
};
