const debug = require('debug');

/**
 * Logger utility for the Nostr relay
 * 
 * Usage:
 * - Import the logger: const logger = require('./utils/logger');
 * - Create a namespaced logger: const log = logger('namespace');
 * - Log messages: log('message');
 * 
 * Enable logging with environment variables:
 * - DEBUG=* (all logs)
 * - DEBUG=nostr:* (all relay logs)
 * - DEBUG=nostr:event,nostr:server (only event and server logs)
 */

// Base namespace for all relay logs
const BASE_NAMESPACE = 'nostr';

/**
 * Create a logger for a specific namespace
 * @param {string} namespace - The namespace for the logger
 * @returns {Function} - The logger function
 */
function createLogger(namespace) {
  // Create the full namespace
  const fullNamespace = `${BASE_NAMESPACE}:${namespace}`;
  
  // Create the debug logger
  const debugLogger = debug(fullNamespace);
  
  // Return a function that logs messages
  return function(message, ...args) {
    debugLogger(message, ...args);
  };
}

/**
 * Create an error logger that always outputs regardless of DEBUG setting
 * @param {string} namespace - The namespace for the logger
 * @returns {Function} - The error logger function
 */
function createErrorLogger(namespace) {
  // Create the full namespace
  const fullNamespace = `${BASE_NAMESPACE}:${namespace}:error`;
  
  // Create the debug logger with forced enabling
  const errorLogger = debug(fullNamespace);
  errorLogger.enabled = true;
  
  // Return a function that logs error messages
  return function(message, ...args) {
    // Log to console.error for errors
    console.error(`[${fullNamespace}]`, message, ...args);
  };
}

/**
 * Create loggers for a specific namespace
 * @param {string} namespace - The namespace for the loggers
 * @returns {Object} - Object with log and error functions
 */
module.exports = function(namespace) {
  return {
    log: createLogger(namespace),
    error: createErrorLogger(namespace)
  };
};
