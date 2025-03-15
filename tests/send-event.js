const nostrTools = require('nostr-tools');

// Use the correct functions based on the API output
const sk = nostrTools.generateSecretKey();
const pk = nostrTools.getPublicKey(sk);

console.log('Generated private key:', Buffer.from(sk).toString('hex'));
console.log('Generated public key:', pk);

// Create event
const event = {
  kind: 1,
  created_at: Math.floor(Date.now() / 1000),
  tags: [ ['client', 'DJ\'s nasty script'], ['SomeTag', 'ElephantTag']],
  content: 'Test message from Node.js script ' + new Date().toISOString(),
  pubkey: pk
};

// Sign event using finalizeEvent (which is the correct function name in your version)
const signedEvent = nostrTools.finalizeEvent(event, sk);

console.log('Event created:', signedEvent);

// Send to relay
const WebSocket = require('ws');
const ws = new WebSocket('ws://<your host and port>');

ws.on('open', function open() {
  console.log('Connected to relay');
  
  // Send the event
  const message = JSON.stringify(['EVENT', signedEvent]);
  console.log('Sending message:', message);
  ws.send(message);
  
  // Listen for responses for a few seconds
  setTimeout(() => {
    console.log('Closing connection');
    ws.close();
  }, 5000);
});

ws.on('message', function incoming(data) {
  console.log('Received response:', data.toString());
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});
