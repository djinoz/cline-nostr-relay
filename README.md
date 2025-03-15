# Cline Nostr Relay

A simple Nostr relay implementation using Node.js, PostgreSQL, and Knex.

## Features

- WebSocket server for Nostr protocol communication
- PostgreSQL database for event storage
- Support for basic NIPs:
  - NIP-01: Basic protocol flow primitives
  - NIP-02: Contact List and Petnames
  - NIP-09: Event Deletion
  - NIP-11: Relay Information Document
  - NIP-20: Command Results

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/cline-nostr-relay.git
   cd cline-nostr-relay
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env` and update the values
   - Set your PostgreSQL connection details

4. Create the database:
   ```
   createdb nostr_relay
   ```

5. Run migrations:
   ```
   npm run migrate
   ```

## Usage

### Development

Start the server in development mode with hot reloading:

```
npm run dev
```

### Production

Start the server in production mode:

```
npm start
```

### Logging

The relay uses namespaced logging that can be controlled via the DEBUG environment variable:

```
# Show all logs
DEBUG=* npm start

# Show only event-related logs
DEBUG=nostr:event npm start

# Show multiple categories
DEBUG=nostr:event,nostr:server npm start

# Show all relay logs
DEBUG=nostr:* npm start
```

Error logs are always displayed regardless of the DEBUG setting.

## API

### WebSocket Endpoint

The WebSocket endpoint is available at:

```
ws://localhost:8008
```

### HTTP Endpoint

The HTTP endpoint for NIP-11 relay information is available at:

```
http://localhost:8008
```

## Database Schema

The main table is `events` with the following structure:

- `id` (primary key)
- `event_id` (the Nostr event id)
- `pubkey` (author's public key)
- `created_at` (timestamp)
- `kind` (event type)
- `tags` (JSONB array)
- `content` (event content)
- `sig` (signature)
- `deleted` (boolean flag for NIP-09)

## License

ISC
