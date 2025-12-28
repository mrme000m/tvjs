const { ValidationError } = require('./errors');

/**
 * Valid timeframe values
 */
const VALID_TIMEFRAMES = [
  '1', '3', '5', '15', '30', '45',
  '60', '120', '180', '240',
  '1D', '1W', '1M',
  'D', 'W', 'M', // Alternative format
];

/**
 * Valid timezone values
 */
const VALID_TIMEZONES = [
  'Etc/UTC', 'exchange',
  'Pacific/Honolulu', 'America/Juneau', 'America/Los_Angeles',
  'America/Phoenix', 'America/Vancouver', 'US/Mountain',
  'America/El_Salvador', 'America/Bogota', 'America/Chicago',
  'America/Lima', 'America/Mexico_City', 'America/Caracas',
  'America/New_York', 'America/Toronto', 'America/Argentina/Buenos_Aires',
  'America/Santiago', 'America/Sao_Paulo', 'Atlantic/Reykjavik',
  'Europe/Dublin', 'Africa/Lagos', 'Europe/Lisbon', 'Europe/London',
  'Europe/Amsterdam', 'Europe/Belgrade', 'Europe/Berlin',
  'Europe/Brussels', 'Europe/Copenhagen', 'Africa/Johannesburg',
  'Africa/Cairo', 'Europe/Luxembourg', 'Europe/Madrid', 'Europe/Malta',
  'Europe/Oslo', 'Europe/Paris', 'Europe/Rome', 'Europe/Stockholm',
  'Europe/Warsaw', 'Europe/Zurich', 'Europe/Athens', 'Asia/Bahrain',
  'Europe/Helsinki', 'Europe/Istanbul', 'Asia/Jerusalem', 'Asia/Kuwait',
  'Europe/Moscow', 'Asia/Qatar', 'Europe/Riga', 'Asia/Riyadh',
  'Europe/Tallinn', 'Europe/Vilnius', 'Asia/Tehran', 'Asia/Dubai',
  'Asia/Muscat', 'Asia/Ashkhabad', 'Asia/Kolkata', 'Asia/Almaty',
  'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Ho_Chi_Minh', 'Asia/Chongqing',
  'Asia/Hong_Kong', 'Australia/Perth', 'Asia/Shanghai', 'Asia/Singapore',
  'Asia/Taipei', 'Asia/Seoul', 'Asia/Tokyo', 'Australia/Brisbane',
  'Australia/Adelaide', 'Australia/Sydney', 'Pacific/Norfolk',
  'Pacific/Auckland', 'Pacific/Fakaofo', 'Pacific/Chatham',
];

/**
 * Valid chart types
 */
const VALID_CHART_TYPES = [
  'HeikinAshi', 'Renko', 'LineBreak', 'Kagi', 'PointAndFigure', 'Range',
];

/**
 * Valid adjustment types
 */
const VALID_ADJUSTMENTS = ['splits', 'dividends'];

/**
 * Valid session types
 */
const VALID_SESSIONS = ['regular', 'extended'];

/**
 * Validators object
 */
const validators = {
  /**
   * Validate symbol
   * @param {string} symbol Market symbol
   * @param {string} fieldName Field name for error message
   * @throws {ValidationError}
   */
  validateSymbol(symbol, fieldName = 'symbol') {
    if (!symbol || typeof symbol !== 'string') {
      throw new ValidationError(
        `${fieldName} must be a non-empty string`,
        fieldName,
        { value: symbol },
      );
    }

    if (symbol.trim().length === 0) {
      throw new ValidationError(
        `${fieldName} cannot be empty or whitespace`,
        fieldName,
        { value: symbol },
      );
    }

    // Check for reasonable length (TradingView symbols are typically under 50 chars)
    const MAX_SYMBOL_LENGTH = 100;
    if (symbol.length > MAX_SYMBOL_LENGTH) {
      throw new ValidationError(
        `${fieldName} is too long (max ${MAX_SYMBOL_LENGTH} characters)`,
        fieldName,
        { value: symbol, length: symbol.length },
      );
    }
  },

  /**
   * Validate timeframe
   * @param {string} timeframe Timeframe value
   * @param {string} fieldName Field name for error message
   * @throws {ValidationError}
   */
  validateTimeframe(timeframe, fieldName = 'timeframe') {
    if (!timeframe) return; // Optional parameter

    if (typeof timeframe !== 'string') {
      throw new ValidationError(
        `${fieldName} must be a string`,
        fieldName,
        { value: timeframe, type: typeof timeframe },
      );
    }

    if (!VALID_TIMEFRAMES.includes(timeframe)) {
      throw new ValidationError(
        `${fieldName} must be one of: ${VALID_TIMEFRAMES.join(', ')}`,
        fieldName,
        { value: timeframe, validValues: VALID_TIMEFRAMES },
      );
    }
  },

  /**
   * Validate timezone
   * @param {string} timezone Timezone value
   * @param {string} fieldName Field name for error message
   * @throws {ValidationError}
   */
  validateTimezone(timezone, fieldName = 'timezone') {
    if (!timezone) return; // Optional parameter

    if (typeof timezone !== 'string') {
      throw new ValidationError(
        `${fieldName} must be a string`,
        fieldName,
        { value: timezone, type: typeof timezone },
      );
    }

    if (!VALID_TIMEZONES.includes(timezone)) {
      throw new ValidationError(
        `${fieldName} is not a valid timezone. See documentation for valid values.`,
        fieldName,
        { value: timezone },
      );
    }
  },

  /**
   * Validate chart type
   * @param {string} type Chart type
   * @param {string} fieldName Field name for error message
   * @throws {ValidationError}
   */
  validateChartType(type, fieldName = 'type') {
    if (!type) return; // Optional parameter

    if (typeof type !== 'string') {
      throw new ValidationError(
        `${fieldName} must be a string`,
        fieldName,
        { value: type, type: typeof type },
      );
    }

    if (!VALID_CHART_TYPES.includes(type)) {
      throw new ValidationError(
        `${fieldName} must be one of: ${VALID_CHART_TYPES.join(', ')}`,
        fieldName,
        { value: type, validValues: VALID_CHART_TYPES },
      );
    }
  },

  /**
   * Validate adjustment
   * @param {string} adjustment Adjustment type
   * @param {string} fieldName Field name for error message
   * @throws {ValidationError}
   */
  validateAdjustment(adjustment, fieldName = 'adjustment') {
    if (!adjustment) return; // Optional parameter

    if (typeof adjustment !== 'string') {
      throw new ValidationError(
        `${fieldName} must be a string`,
        fieldName,
        { value: adjustment, type: typeof adjustment },
      );
    }

    if (!VALID_ADJUSTMENTS.includes(adjustment)) {
      throw new ValidationError(
        `${fieldName} must be one of: ${VALID_ADJUSTMENTS.join(', ')}`,
        fieldName,
        { value: adjustment, validValues: VALID_ADJUSTMENTS },
      );
    }
  },

  /**
   * Validate session
   * @param {string} session Session type
   * @param {string} fieldName Field name for error message
   * @throws {ValidationError}
   */
  validateSession(session, fieldName = 'session') {
    if (!session) return; // Optional parameter

    if (typeof session !== 'string') {
      throw new ValidationError(
        `${fieldName} must be a string`,
        fieldName,
        { value: session, type: typeof session },
      );
    }

    if (!VALID_SESSIONS.includes(session)) {
      throw new ValidationError(
        `${fieldName} must be one of: ${VALID_SESSIONS.join(', ')}`,
        fieldName,
        { value: session, validValues: VALID_SESSIONS },
      );
    }
  },

  /**
   * Validate positive number
   * @param {number} value Number value
   * @param {string} fieldName Field name for error message
   * @param {boolean} allowZero Allow zero value
   * @throws {ValidationError}
   */
  validatePositiveNumber(value, fieldName, allowZero = true) {
    if (value === undefined || value === null) return; // Optional parameter

    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new ValidationError(
        `${fieldName} must be a valid number`,
        fieldName,
        { value, type: typeof value },
      );
    }

    if (!Number.isFinite(value)) {
      throw new ValidationError(
        `${fieldName} must be a finite number`,
        fieldName,
        { value },
      );
    }

    const EPSILON = 0.000001; // Minimum positive value when zero is not allowed
    const minValue = allowZero ? 0 : EPSILON;
    if (value < minValue) {
      throw new ValidationError(
        `${fieldName} must be ${allowZero ? 'non-negative' : 'positive'}`,
        fieldName,
        { value, minimum: minValue },
      );
    }
  },

  /**
   * Validate timestamp
   * @param {number} timestamp Unix timestamp
   * @param {string} fieldName Field name for error message
   * @throws {ValidationError}
   */
  validateTimestamp(timestamp, fieldName = 'timestamp') {
    if (timestamp === undefined || timestamp === null) return; // Optional parameter

    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
      throw new ValidationError(
        `${fieldName} must be a valid number`,
        fieldName,
        { value: timestamp, type: typeof timestamp },
      );
    }

    if (!Number.isFinite(timestamp)) {
      throw new ValidationError(
        `${fieldName} must be a finite number`,
        fieldName,
        { value: timestamp },
      );
    }

    // Reasonable timestamp range (year 2000 to year 2100)
    const MIN_TIMESTAMP = 946684800; // 2000-01-01 00:00:00 UTC
    const MAX_TIMESTAMP = 4102444800; // 2100-01-01 00:00:00 UTC

    if (timestamp < MIN_TIMESTAMP || timestamp > MAX_TIMESTAMP) {
      throw new ValidationError(
        `${fieldName} must be between ${MIN_TIMESTAMP} and ${MAX_TIMESTAMP}`,
        fieldName,
        { value: timestamp, min: MIN_TIMESTAMP, max: MAX_TIMESTAMP },
      );
    }
  },

  /**
   * Validate currency code
   * @param {string} currency Currency code
   * @param {string} fieldName Field name for error message
   * @throws {ValidationError}
   */
  validateCurrency(currency, fieldName = 'currency') {
    if (!currency) return; // Optional parameter

    if (typeof currency !== 'string') {
      throw new ValidationError(
        `${fieldName} must be a string`,
        fieldName,
        { value: currency, type: typeof currency },
      );
    }

    // Basic validation: 3-4 uppercase letters
    if (!/^[A-Z]{3,4}$/.test(currency)) {
      throw new ValidationError(
        `${fieldName} must be a valid currency code (3-4 uppercase letters)`,
        fieldName,
        { value: currency },
      );
    }
  },

  /**
   * Validate boolean
   * @param {boolean} value Boolean value
   * @param {string} fieldName Field name for error message
   * @throws {ValidationError}
   */
  validateBoolean(value, fieldName) {
    if (value === undefined || value === null) return; // Optional parameter

    if (typeof value !== 'boolean') {
      throw new ValidationError(
        `${fieldName} must be a boolean`,
        fieldName,
        { value, type: typeof value },
      );
    }
  },
};

module.exports = {
  ...validators,
  VALID_TIMEFRAMES,
  VALID_TIMEZONES,
  VALID_CHART_TYPES,
  VALID_ADJUSTMENTS,
  VALID_SESSIONS,
};
