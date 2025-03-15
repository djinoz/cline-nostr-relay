/**
 * Utility for validating Nostr events
 */
class EventValidator {
  /**
   * Validate a Nostr event
   * @param {Object} event - The event to validate
   * @returns {boolean} - Whether the event is valid
   */
  validateEvent(event) {
    try {
      // Check required fields
      if (!event.id || typeof event.id !== 'string' || event.id.length !== 64) {
        return false;
      }
      
      if (!event.pubkey || typeof event.pubkey !== 'string' || event.pubkey.length !== 64) {
        return false;
      }
      
      if (!event.created_at || typeof event.created_at !== 'number') {
        return false;
      }
      
      if (typeof event.kind !== 'number') {
        return false;
      }
      
      if (!Array.isArray(event.tags)) {
        return false;
      }
      
      // Validate tags format
      for (const tag of event.tags) {
        if (!Array.isArray(tag) || tag.length === 0) {
          return false;
        }
        
        if (typeof tag[0] !== 'string') {
          return false;
        }
      }
      
      if (typeof event.content !== 'string') {
        return false;
      }
      
      if (!event.sig || typeof event.sig !== 'string' || event.sig.length !== 128) {
        return false;
      }
      
      // TODO: Implement signature verification
      // For a basic relay, we'll skip cryptographic verification
      // In a production relay, you would verify the signature here
      
      return true;
    } catch (error) {
      console.error('Event validation error:', error);
      return false;
    }
  }
  
  /**
   * Validate a deletion event (NIP-09)
   * @param {Object} event - The deletion event
   * @param {Array} eventIds - IDs of events to delete
   * @returns {boolean} - Whether the deletion is valid
   */
  validateDeletion(event, eventIds) {
    // Must be a kind 5 event
    if (event.kind !== 5) {
      return false;
    }
    
    // Must have at least one e tag
    const eTags = event.tags.filter(tag => tag[0] === 'e');
    if (eTags.length === 0) {
      return false;
    }
    
    // Check if all event IDs to delete are in the e tags
    const taggedEventIds = eTags.map(tag => tag[1]);
    return eventIds.every(id => taggedEventIds.includes(id));
  }
}

module.exports = new EventValidator();
