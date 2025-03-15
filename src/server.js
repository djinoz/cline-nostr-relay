const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');
const eventHandler = require('./handlers/event');

/**
 * Nostr relay server implementation
 */
class NostrServer {
  /**
   * Initialize the Nostr relay server
   * @param {number} port - The port to listen on
   */
  constructor(port) {
    this.port = port;
    this.app = express();
    this.setupExpress();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.setupWebSocketServer();
  }

  /**
   * Set up Express for HTTP endpoints
   */
  setupExpress() {
    this.app.use(cors());
    this.app.use(express.json());

    // NIP-11: Relay Information Document
    this.app.get('/', (req, res) => {
      // Check if the client is requesting the relay information document
      const acceptHeader = req.headers.accept || '';
      
      if (acceptHeader.includes('application/nostr+json')) {
        return res.json({
          name: 'Cline Nostr Relay',
          description: 'A simple Nostr relay implementation',
          pubkey: '', // The relay operator's pubkey (if any)
          contact: '',
          supported_nips: [1, 2, 9, 11, 20],
          software: 'https://github.com/yourusername/cline-nostr-relay',
          version: '0.1.0'
        });
      }
      
      // Regular HTTP request
      res.send('Cline Nostr Relay - WebSocket endpoint available at ws://localhost:' + this.port);
    });
  }

  /**
   * Set up WebSocket server for Nostr protocol
   */
  setupWebSocketServer() {
    this.wss.on('connection', (ws) => {
      console.log('Client connected');

      ws.on('message', async (message) => {
        try {
          // Log the raw message for debugging
          console.log('Received message:', message.toString().substring(0, 200) + (message.length > 200 ? '...' : ''));
          
          let data;
          try {
            data = JSON.parse(message);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return this.sendNotice(ws, 'Invalid JSON format');
          }
          
          if (!Array.isArray(data)) {
            console.error('Invalid message format (not an array):', data);
            return this.sendNotice(ws, 'Invalid message format: expected array');
          }
          
          const [type, ...params] = data;
          console.log(`Processing ${type} message with ${params.length} parameters`);
          
          switch (type) {
            case 'EVENT':
              await this.handleEventMessage(ws, params);
              break;
            
            case 'REQ':
              await this.handleReqMessage(ws, params);
              break;
            
            case 'CLOSE':
              this.handleCloseMessage(ws, params);
              break;
            
            default:
              console.warn(`Unknown message type: ${type}`);
              this.sendNotice(ws, `Unknown message type: ${type}`);
          }
        } catch (error) {
          console.error('Error processing message:', error);
          this.sendNotice(ws, 'Error processing message: ' + (error.message || 'Unknown error'));
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        eventHandler.removeClientSubscriptions(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  /**
   * Handle EVENT message
   * @param {WebSocket} ws - The client's WebSocket connection
   * @param {Array} params - Message parameters [event]
   */
  async handleEventMessage(ws, params) {
    if (params.length < 1) {
      return this.sendNotice(ws, 'Invalid EVENT message');
    }
    
    const event = params[0];
    const result = await eventHandler.handleEvent(event, ws);
    
    // NIP-20: Command Results
    if (result.success) {
      ws.send(JSON.stringify(['OK', event.id, true, '']));
    } else {
      ws.send(JSON.stringify(['OK', event.id, false, result.message]));
    }
  }

  /**
   * Handle REQ message
   * @param {WebSocket} ws - The client's WebSocket connection
   * @param {Array} params - Message parameters [subscriptionId, ...filters]
   */
  async handleReqMessage(ws, params) {
    if (params.length < 2) {
      return this.sendNotice(ws, 'Invalid REQ message');
    }
    
    const [subscriptionId, ...filters] = params;
    
    if (typeof subscriptionId !== 'string') {
      return this.sendNotice(ws, 'Invalid subscription ID');
    }
    
    await eventHandler.handleSubscription(subscriptionId, filters, ws);
  }

  /**
   * Handle CLOSE message
   * @param {WebSocket} ws - The client's WebSocket connection
   * @param {Array} params - Message parameters [subscriptionId]
   */
  handleCloseMessage(ws, params) {
    if (params.length < 1) {
      return this.sendNotice(ws, 'Invalid CLOSE message');
    }
    
    const [subscriptionId] = params;
    
    if (typeof subscriptionId !== 'string') {
      return this.sendNotice(ws, 'Invalid subscription ID');
    }
    
    eventHandler.removeSubscription(subscriptionId);
  }

  /**
   * Send a NOTICE message to a client
   * @param {WebSocket} ws - The client's WebSocket connection
   * @param {string} message - The notice message
   */
  sendNotice(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(['NOTICE', message]));
    }
  }

  /**
   * Start the server
   * @returns {Promise} - Resolves when the server is listening
   */
  start() {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`Nostr relay server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  stop() {
    this.server.close();
  }
}

module.exports = NostrServer;
