/**
 * Configuration module for TradingView API
 * Replaces global state pollution with proper configuration management
 */

const config = {
  /** Enable debug logging */
  debug: false,
};

/**
 * Set debug mode
 * @param {boolean} value Enable or disable debug mode
 */
function setDebug(value) {
  if (typeof value !== 'boolean') {
    throw new TypeError('Debug value must be a boolean');
  }
  config.debug = value;
}

/**
 * Get debug mode status
 * @returns {boolean} Current debug mode status
 */
function isDebugEnabled() {
  return config.debug;
}

module.exports = {
  config,
  setDebug,
  isDebugEnabled,
};
