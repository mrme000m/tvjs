/**
 * Base error class for TradingView API errors
 * @class
 */
class TradingViewAPIError extends Error {
  /**
   * @param {string} message Error message
   * @param {string} type Error type
   * @param {*} details Additional error details
   */
  constructor(message, type = 'unknown', details = null) {
    super(message);
    this.name = 'TradingViewAPIError';
    this.type = type;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Network/Connection related errors
 * @class
 */
class ConnectionError extends TradingViewAPIError {
  constructor(message, details = null) {
    super(message, 'connection', details);
    this.name = 'ConnectionError';
  }
}

/**
 * Protocol/WebSocket packet errors
 * @class
 */
class ProtocolError extends TradingViewAPIError {
  constructor(message, details = null) {
    super(message, 'protocol', details);
    this.name = 'ProtocolError';
  }
}

/**
 * Input validation errors
 * @class
 */
class ValidationError extends TradingViewAPIError {
  constructor(message, field = null, details = null) {
    super(message, 'validation', details);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Authentication/Authorization errors
 * @class
 */
class AuthenticationError extends TradingViewAPIError {
  constructor(message, details = null) {
    super(message, 'authentication', details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Symbol/Market errors
 * @class
 */
class SymbolError extends TradingViewAPIError {
  constructor(message, symbol = null, details = null) {
    super(message, 'symbol', details);
    this.name = 'SymbolError';
    this.symbol = symbol;
  }
}

/**
 * Indicator/Study errors
 * @class
 */
class IndicatorError extends TradingViewAPIError {
  constructor(message, indicatorId = null, details = null) {
    super(message, 'indicator', details);
    this.name = 'IndicatorError';
    this.indicatorId = indicatorId;
  }
}

/**
 * Session management errors
 * @class
 */
class SessionError extends TradingViewAPIError {
  constructor(message, details = null) {
    super(message, 'session', details);
    this.name = 'SessionError';
  }
}

module.exports = {
  TradingViewAPIError,
  ConnectionError,
  ProtocolError,
  ValidationError,
  AuthenticationError,
  SymbolError,
  IndicatorError,
  SessionError,
};
