const db = require('./knex');

/**
 * Repository for handling Nostr event database operations
 */
class EventRepository {
  /**
   * Save a new event to the database
   * @param {Object} event - Nostr event object
   * @returns {Promise<string>} - The saved event ID
   */
  async saveEvent(event) {
    try {
      await db('events').insert({
        event_id: event.id,
        pubkey: event.pubkey,
        created_at: event.created_at,
        kind: event.kind,
        tags: JSON.stringify(event.tags),
        content: event.content,
        sig: event.sig
      });
      return event.id;
    } catch (error) {
      // If it's a duplicate key error, just return the event ID
      if (error.code === '23505') {
        return event.id;
      }
      throw error;
    }
  }

  /**
   * Find events matching the given filters
   * @param {Array} filters - Array of filter objects
   * @returns {Promise<Array>} - Array of matching events
   */
  async findEvents(filters) {
    let query = db('events').where('deleted', false);
    
    // Apply filters
    if (!filters || filters.length === 0) {
      return [];
    }
    
    try {
      // Process each filter as an OR condition
      const events = await Promise.all(filters.map(async filter => {
        let subQuery = db('events').where('deleted', false);
        
        // Apply filter conditions
        if (filter.ids) {
          subQuery = subQuery.whereIn('event_id', filter.ids);
        }
        
        if (filter.authors) {
          subQuery = subQuery.whereIn('pubkey', filter.authors);
        }
        
        if (filter.kinds) {
          subQuery = subQuery.whereIn('kind', filter.kinds);
        }
        
        if (filter.since) {
          subQuery = subQuery.where('created_at', '>=', filter.since);
        }
        
        if (filter.until) {
          subQuery = subQuery.where('created_at', '<=', filter.until);
        }
        
        if (filter.limit) {
          subQuery = subQuery.limit(filter.limit);
        }
        
        // Handle tag filters (#e, #p, etc.)
        if (filter) {
          Object.keys(filter).forEach(key => {
            if (key.startsWith('#')) {
              const tagName = key.substring(1);
              const tagValues = filter[key];
              
              // Filter by tag values using JSONB query
              subQuery = subQuery.whereRaw(`
                EXISTS (
                  SELECT 1 FROM jsonb_array_elements(tags) tag
                  WHERE tag->0 = ? AND tag->1 = ANY(?)
                )
              `, [JSON.stringify(tagName), tagValues]);
            }
          });
        }
        
        // Order by created_at descending
        subQuery = subQuery.orderBy('created_at', 'desc');
        
        return subQuery;
      }));
      
      // Flatten and deduplicate events
      const flattenedEvents = events.flat();
      const uniqueEvents = [...new Map(flattenedEvents.map(event => [event.event_id, event])).values()];
      
      return uniqueEvents.map(this._formatEvent);
    } catch (error) {
      console.error('Error finding events:', error);
      throw error;
    }
  }

  /**
   * Mark events as deleted (for NIP-09)
   * @param {string} eventId - ID of the event to delete
   * @param {string} pubkey - Public key of the user requesting deletion
   * @returns {Promise<boolean>} - Whether the deletion was successful
   */
  async markEventAsDeleted(eventId, pubkey) {
    try {
      const updated = await db('events')
        .where({ event_id: eventId, pubkey })
        .update({ deleted: true });
      
      return updated > 0;
    } catch (error) {
      console.error('Error marking event as deleted:', error);
      throw error;
    }
  }

  /**
   * Format database event to Nostr event format
   * @param {Object} dbEvent - Event from database
   * @returns {Object} - Formatted Nostr event
   * @private
   */
  _formatEvent(dbEvent) {
    return {
      id: dbEvent.event_id,
      pubkey: dbEvent.pubkey,
      created_at: dbEvent.created_at,
      kind: dbEvent.kind,
      tags: typeof dbEvent.tags === 'string' ? JSON.parse(dbEvent.tags) : dbEvent.tags,
      content: dbEvent.content,
      sig: dbEvent.sig
    };
  }
}

module.exports = new EventRepository();
