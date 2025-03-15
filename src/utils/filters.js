/**
 * Utility for matching events against subscription filters
 */
class FilterMatcher {
  /**
   * Check if an event matches a filter
   * @param {Object} event - The Nostr event
   * @param {Object} filter - The subscription filter
   * @returns {boolean} - Whether the event matches the filter
   */
  matchFilter(event, filter) {
    // Check ids
    if (filter.ids && !filter.ids.includes(event.id)) {
      return false;
    }
    
    // Check authors
    if (filter.authors && !filter.authors.includes(event.pubkey)) {
      return false;
    }
    
    // Check kinds
    if (filter.kinds && !filter.kinds.includes(event.kind)) {
      return false;
    }
    
    // Check since
    if (filter.since && event.created_at < filter.since) {
      return false;
    }
    
    // Check until
    if (filter.until && event.created_at > filter.until) {
      return false;
    }
    
    // Check tag filters (#e, #p, etc.)
    for (const key in filter) {
      if (key.startsWith('#')) {
        const tagName = key.substring(1);
        const tagValues = filter[key];
        
        // Find tags with matching name
        const matchingTags = event.tags.filter(tag => tag[0] === tagName);
        
        // Check if any tag value matches the filter
        if (matchingTags.length === 0 || !matchingTags.some(tag => tagValues.includes(tag[1]))) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Check if an event matches any of the filters
   * @param {Object} event - The Nostr event
   * @param {Array} filters - Array of subscription filters
   * @returns {boolean} - Whether the event matches any filter
   */
  matchFilters(event, filters) {
    if (!filters || filters.length === 0) {
      return false;
    }
    
    return filters.some(filter => this.matchFilter(event, filter));
  }
}

module.exports = new FilterMatcher();
