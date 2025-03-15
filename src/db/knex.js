const knex = require('knex');
const config = require('../../knexfile');

// Determine which configuration to use based on environment
const environment = process.env.NODE_ENV || 'development';
const connectionConfig = config[environment];

// Create and export the database connection
const db = knex(connectionConfig);

module.exports = db;
