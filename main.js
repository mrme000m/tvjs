const miscRequests = require('./src/miscRequests');
const Client = require('./src/client');
const BuiltInIndicator = require('./src/classes/BuiltInIndicator');
const PineIndicator = require('./src/classes/PineIndicator');
const PinePermManager = require('./src/classes/PinePermManager');
const errors = require('./src/errors');
const config = require('./src/config');

module.exports = { ...miscRequests };
module.exports.Client = Client;
module.exports.BuiltInIndicator = BuiltInIndicator;
module.exports.PineIndicator = PineIndicator;
module.exports.PinePermManager = PinePermManager;

// Export error classes for users to catch and handle
module.exports.errors = errors;
module.exports.TradingViewAPIError = errors.TradingViewAPIError;
module.exports.ConnectionError = errors.ConnectionError;
module.exports.ProtocolError = errors.ProtocolError;
module.exports.ValidationError = errors.ValidationError;
module.exports.AuthenticationError = errors.AuthenticationError;
module.exports.SymbolError = errors.SymbolError;
module.exports.IndicatorError = errors.IndicatorError;
module.exports.SessionError = errors.SessionError;

// Export configuration utilities
module.exports.setDebug = config.setDebug;
module.exports.isDebugEnabled = config.isDebugEnabled;
