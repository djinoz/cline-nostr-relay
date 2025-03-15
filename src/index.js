require('dotenv').config();
const NostrServer = require('./server');
const db = require('./db/knex');
const logger = require('./utils/logger')('main');

/**
 * Main entry point for the Nostr relay
 */
async function main() {
  try {
    // Run database migrations
    logger.log('Running database migrations...');
    await db.migrate.latest();
    logger.log('Migrations completed successfully');

    // Start the server
    const port = process.env.PORT || 8008;
    const server = new NostrServer(port);
    
    await server.start();
    logger.log(`Nostr relay is running on port ${port}`);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.log('Shutting down...');
      server.stop();
      await db.destroy();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.log('Shutting down...');
      server.stop();
      await db.destroy();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start the relay:', error);
    process.exit(1);
  }
}

// Start the application
main();
