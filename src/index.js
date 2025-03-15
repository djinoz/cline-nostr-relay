require('dotenv').config();
const NostrServer = require('./server');
const db = require('./db/knex');

/**
 * Main entry point for the Nostr relay
 */
async function main() {
  try {
    // Run database migrations
    console.log('Running database migrations...');
    await db.migrate.latest();
    console.log('Migrations completed successfully');

    // Start the server
    const port = process.env.PORT || 8008;
    const server = new NostrServer(port);
    
    await server.start();
    console.log(`Nostr relay is running on port ${port}`);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      server.stop();
      await db.destroy();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Shutting down...');
      server.stop();
      await db.destroy();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start the relay:', error);
    process.exit(1);
  }
}

// Start the application
main();
