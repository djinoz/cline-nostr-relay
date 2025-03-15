const eventRepository = require('../db/repository');
const eventValidator = require('../utils/event-validator');
const filterMatcher = require('../utils/filters');

/**
 * Handler for processing Nostr events
 */
class EventHandler {
  constructor() {
    this.subscriptions = new Map(); // Map of subscription ID to { filters, client }
  }

  /**
   * Process an incoming event
   * @param {Object} event - The Nostr event
   * @param {WebSocket} client - The client that sent the event
   * @returns {Object} - Result object { success, message, event_id }
   */
  async handleEvent(event, client) {
    try {
      // Validate the event
      if (!eventValidator.validateEvent(event)) {
        return { 
          success: false, 
          message: 'Invalid event', 
          event_id: event.id 
        };
      }

      // Handle deletion events (NIP-09)
      if (event.kind === 5) {
        return await this.handleDeletion(event);
      }

      // Save the event to the database
      const eventId = await eventRepository.saveEvent(event);

      // Broadcast the event to subscribers
      this.broadcastEvent(event);

      return { 
        success: true, 
        message: 'Event saved', 
        event_id: eventId 
      };
    } catch (error) {
      console.error('Error handling event:', error);
      return { 
        success: false, 
        message: 'Error processing event', 
        event_id: event.id 
      };
    }
  }

  /**
   * Handle a deletion event (NIP-09)
   * @param {Object} event - The deletion event
   * @returns {Object} - Result object { success, message, event_id }
   */
  async handleDeletion(event) {
    try {
      // Extract event IDs to delete from e tags
      const eventIds = event.tags
        .filter(tag => tag[0] === 'e')
        .map(tag => tag[1]);

      if (eventIds.length === 0) {
        return { 
          success: false, 
          message: 'No event IDs specified for deletion', 
          event_id: event.id 
        };
      }

      // Validate the deletion
      if (!eventValidator.validateDeletion(event, eventIds)) {
        return { 
          success: false, 
          message: 'Invalid deletion event', 
          event_id: event.id 
        };
      }

      // Mark events as deleted
      const results = await Promise.all(
        eventIds.map(id => eventRepository.markEventAsDeleted(id, event.pubkey))
      );

      // Save the deletion event itself
      await eventRepository.saveEvent(event);

      // Check if any events were actually deleted
      const deletedCount = results.filter(Boolean).length;

      return { 
        success: true, 
        message: `Deleted ${deletedCount} events`, 
        event_id: event.id 
      };
    } catch (error) {
      console.error('Error handling deletion:', error);
      return { 
        success: false, 
        message: 'Error processing deletion', 
        event_id: event.id 
      };
    }
  }

  /**
   * Register a new subscription
   * @param {string} subscriptionId - The subscription ID
   * @param {Array} filters - Array of filters
   * @param {WebSocket} client - The client's WebSocket connection
   */
  addSubscription(subscriptionId, filters, client) {
    this.subscriptions.set(subscriptionId, { filters, client });
  }

  /**
   * Remove a subscription
   * @param {string} subscriptionId - The subscription ID to remove
   */
  removeSubscription(subscriptionId) {
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Remove all subscriptions for a client
   * @param {WebSocket} client - The client's WebSocket connection
   */
  removeClientSubscriptions(client) {
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (subscription.client === client) {
        this.subscriptions.delete(id);
      }
    }
  }

  /**
   * Broadcast an event to matching subscribers
   * @param {Object} event - The event to broadcast
   */
  broadcastEvent(event) {
    for (const [subscriptionId, { filters, client }] of this.subscriptions.entries()) {
      if (client.readyState === client.OPEN && filterMatcher.matchFilters(event, filters)) {
        try {
          client.send(JSON.stringify(['EVENT', subscriptionId, event]));
        } catch (error) {
          console.error(`Error broadcasting event to subscription ${subscriptionId}:`, error);
        }
      }
    }
  }

  /**
   * Process a subscription request
   * @param {string} subscriptionId - The subscription ID
   * @param {Array} filters - Array of filters
   * @param {WebSocket} client - The client's WebSocket connection
   */
  async handleSubscription(subscriptionId, filters, client) {
    try {
      // Register the subscription
      this.addSubscription(subscriptionId, filters, client);

      try {
        // Log the filters for debugging
        console.log(`Processing subscription ${subscriptionId} with filters:`, JSON.stringify(filters));
        
        // Send matching events from the database
        const events = await eventRepository.findEvents(filters);
        
        console.log(`Found ${events.length} events for subscription ${subscriptionId}`);
        
        for (const event of events) {
          if (client.readyState === client.OPEN) {
            client.send(JSON.stringify(['EVENT', subscriptionId, event]));
          }
        }

        // Send EOSE (End of Stored Events) message
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify(['EOSE', subscriptionId]));
        }
        
        return { success: true };
      } catch (error) {
        console.error(`Error handling subscription ${subscriptionId}:`, error);
        // Remove the subscription if there was an error
        this.removeSubscription(subscriptionId);
        return { success: false, message: 'Error processing subscription' };
      }
    } catch (error) {
      console.error(`Error setting up subscription ${subscriptionId}:`, error);
      return { success: false, message: 'Error setting up subscription' };
    }
  }
}

module.exports = new EventHandler();
