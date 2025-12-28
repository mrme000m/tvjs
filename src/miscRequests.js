const os = require('os');
const axios = require('axios');

const PineIndicator = require('./classes/PineIndicator');
const { genAuthCookies } = require('./utils');

// HTTP status code validation - accept 2xx, 3xx, and 4xx responses
const HTTP_SERVER_ERROR_THRESHOLD = 500;
const validateStatus = (status) => status < HTTP_SERVER_ERROR_THRESHOLD;

const indicators = ['Recommend.Other', 'Recommend.All', 'Recommend.MA'];
const builtInIndicList = [];

async function fetchScanData(tickers = [], columns = []) {
  const { data } = await axios.post(
    'https://scanner.tradingview.com/global/scan',
    {
      symbols: { tickers },
      columns,
    },
    { validateStatus },
  );

  return data;
}

/** @typedef {number} advice */

/**
 * @typedef {{
 *   Other: advice,
 *   All: advice,
 *   MA: advice
 * }} Period
 */

/**
 * @typedef {{
 *  '1': Period,
 *  '5': Period,
 *  '15': Period,
 *  '60': Period,
 *  '240': Period,
 *  '1D': Period,
 *  '1W': Period,
 *  '1M': Period
 * }} Periods
 */

module.exports = {
  /**
   * Get technical analysis
   * @function getTA
   * @param {string} id Full market id (Example: COINBASE:BTCEUR)
   * @returns {Promise<Periods>} results
   */
  async getTA(id) {
    const advice = {};

    const cols = ['1', '5', '15', '60', '240', '1D', '1W', '1M']
      .map((t) => indicators.map((i) => (t !== '1D' ? `${i}|${t}` : i)))
      .flat();

    const rs = await fetchScanData([id], cols);
    if (!rs.data || !rs.data[0]) return false;

    rs.data[0].d.forEach((val, i) => {
      const [name, period] = cols[i].split('|');
      const pName = period || '1D';
      if (!advice[pName]) advice[pName] = {};
      // Convert advice value: multiply by 1000, round, then divide by 500
      const ADVICE_MULTIPLIER = 1000;
      const ADVICE_DIVISOR = 500;
      advice[pName][name.split('.').pop()] = Math.round(val * ADVICE_MULTIPLIER) / ADVICE_DIVISOR;
    });

    return advice;
  },

  /**
   * @typedef {Object} SearchMarketResult
   * @prop {string} id Market full symbol
   * @prop {string} exchange Market exchange name
   * @prop {string} fullExchange Market exchange full name
   * @prop {string} symbol Market symbol
   * @prop {string} description Market name
   * @prop {string} type Market type
   * @prop {() => Promise<Periods>} getTA Get market technical analysis
   */

  /**
   * Find a symbol (deprecated)
   * @function searchMarket
   * @param {string} search Keywords
   * @param {'stock'
   *  | 'futures' | 'forex' | 'cfd'
   *  | 'crypto' | 'index' | 'economic'
   * } [filter] Caterogy filter
   * @returns {Promise<SearchMarketResult[]>} Search results
   * @deprecated Use searchMarketV3 instead
   */
  async searchMarket(search, filter = '') {
    const { data } = await axios.get(
      'https://symbol-search.tradingview.com/symbol_search',
      {
        params: {
          text: search.replace(/ /g, '%20'),
          type: filter,
        },
        headers: {
          origin: 'https://www.tradingview.com',
        },
        validateStatus,
      },
    );

    // Extract helper function for mapping search results
    const mapSearchResult = (s) => {
      const exchange = s.exchange.split(' ')[0];
      const id = `${exchange}:${s.symbol}`;

      return {
        id,
        exchange,
        fullExchange: s.exchange,
        symbol: s.symbol,
        description: s.description,
        type: s.type,
        getTA: () => this.getTA(id),
      };
    };

    return data.map(mapSearchResult);
  },

  /**
   * Find a symbol
   * @function searchMarketV3
   * @param {string} search Keywords
   * @param {'stock'
   *  | 'futures' | 'forex' | 'cfd'
   *  | 'crypto' | 'index' | 'economic'
   * } [filter] Caterogy filter
   * @param {number} offset Pagination offset
   * @returns {Promise<SearchMarketResult[]>} Search results
   */
  async searchMarketV3(search, filter = '', offset = 0) {
    const splittedSearch = search.toUpperCase().replace(/ /g, '+').split(':');

    const request = await axios.get(
      'https://symbol-search.tradingview.com/symbol_search/v3',
      {
        params: {
          exchange: (splittedSearch.length === 2
            ? splittedSearch[0]
            : undefined
          ),
          text: splittedSearch.pop(),
          search_type: filter,
          start: offset,
        },
        headers: {
          origin: 'https://www.tradingview.com',
        },
        validateStatus,
      },
    );

    const { data } = request;

    // Extract helper function for mapping V3 search results
    const mapSearchResultV3 = (s) => {
      const exchange = s.exchange.split(' ')[0];
      const id = s.prefix ? `${s.prefix}:${s.symbol}` : `${exchange.toUpperCase()}:${s.symbol}`;

      return {
        id,
        exchange,
        fullExchange: s.exchange,
        symbol: s.symbol,
        description: s.description,
        type: s.type,
        getTA: () => this.getTA(id),
      };
    };

    return data.symbols.map(mapSearchResultV3);
  },

  /**
   * @typedef {Object} SearchIndicatorResult
   * @prop {string} id Script ID
   * @prop {string} version Script version
   * @prop {string} name Script complete name
   * @prop {{ id: number, username: string }} author Author user ID
   * @prop {string} image Image ID https://tradingview.com/i/${image}
   * @prop {string | ''} source Script source (if available)
   * @prop {'study' | 'strategy'} type Script type (study / strategy)
   * @prop {'open_source' | 'closed_source' | 'invite_only'
   *  | 'private' | 'other'} access Script access type
   * @prop {() => Promise<PineIndicator>} get Get the full indicator informations
   */

  /**
   * Find an indicator
   * @function searchIndicator
   * @param {string} search Keywords
   * @returns {Promise<SearchIndicatorResult[]>} Search results
   */
  async searchIndicator(search = '') {
    if (!builtInIndicList.length) {
      await Promise.all(['standard', 'candlestick', 'fundamental'].map(async (type) => {
        const { data } = await axios.get(
          'https://pine-facade.tradingview.com/pine-facade/list',
          {
            params: {
              filter: type,
            },
            validateStatus,
          },
        );
        builtInIndicList.push(...data);
      }));
    }

    const { data } = await axios.get(
      'https://www.tradingview.com/pubscripts-suggest-json',
      {
        params: {
          search: search.replace(/ /g, '%20'),
        },
        validateStatus,
      },
    );

    // Normalize string for comparison (uppercase, letters only)
    const normalizeString = (str = '') => str.toUpperCase().replace(/[^A-Z]/g, '');

    // Filter function for built-in indicators
    const matchesSearch = (indicator) => (
      normalizeString(indicator.scriptName).includes(normalizeString(search))
      || normalizeString(indicator.extra.shortDescription).includes(normalizeString(search))
    );

    // Map function for built-in indicators
    const mapBuiltInIndicator = (ind) => ({
        id: ind.scriptIdPart,
        version: ind.version,
        name: ind.scriptName,
        author: {
          id: ind.userId,
          username: '@TRADINGVIEW@',
        },
        image: '',
        access: 'closed_source',
        source: '',
        type: (ind.extra && ind.extra.kind) ? ind.extra.kind : 'study',
        get() {
          return module.exports.getIndicator(ind.scriptIdPart, ind.version);
        },
      });

    // Map function for user indicators
    const mapUserIndicator = (ind) => ({
        id: ind.scriptIdPart,
        version: ind.version,
        name: ind.scriptName,
        author: {
          id: ind.author.id,
          username: ind.author.username,
        },
        image: ind.imageUrl,
        access: ['open_source', 'closed_source', 'invite_only'][ind.access - 1] || 'other',
        source: ind.scriptSource,
        type: (ind.extra && ind.extra.kind) ? ind.extra.kind : 'study',
        get() {
          return module.exports.getIndicator(ind.scriptIdPart, ind.version);
        },
      });

    return [
      ...builtInIndicList.filter(matchesSearch).map(mapBuiltInIndicator),
      ...data.results.map(mapUserIndicator),
    ];
  },

  /**
   * Get an indicator
   * @function getIndicator
   * @param {string} id Indicator ID (Like: PUB;XXXXXXXXXXXXXXXXXXXXX)
   * @param {'last' | string} [version] Wanted version of the indicator
   * @param {string} [session] User 'sessionid' cookie
   * @param {string} [signature] User 'sessionid_sign' cookie
   * @returns {Promise<PineIndicator>} Indicator
   */
  async getIndicator(id, version = 'last', session = '', signature = '') {
    const indicID = id.replace(/ |%/g, '%25');

    const { data } = await axios.get(
      `https://pine-facade.tradingview.com/pine-facade/translate/${indicID}/${version}`,
      {
        headers: {
          cookie: genAuthCookies(session, signature),
        },
        validateStatus,
      },
    );

    if (!data.success || !data.result.metaInfo || !data.result.metaInfo.inputs) {
      throw new Error(`Inexistent or unsupported indicator: "${data.reason}"`);
    }

    const inputs = {};

    data.result.metaInfo.inputs.forEach((input) => {
      if (['text', 'pineId', 'pineVersion'].includes(input.id)) return;

      const inlineName = input.name.replace(/ /g, '_').replace(/[^a-zA-Z0-9_]/g, '');

      inputs[input.id] = {
        name: input.name,
        inline: input.inline || inlineName,
        internalID: input.internalID || inlineName,
        tooltip: input.tooltip,

        type: input.type,
        value: input.defval,
        isHidden: !!input.isHidden,
        isFake: !!input.isFake,
      };

      if (input.options) inputs[input.id].options = input.options;
    });

    const plots = {};

    Object.keys(data.result.metaInfo.styles).forEach((plotId) => {
      const plotTitle = data
        .result
        .metaInfo
        .styles[plotId]
        .title
        .replace(/ /g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '');

      const titles = Object.values(plots);

      if (titles.includes(plotTitle)) {
        const DUPLICATE_PLOT_START_INDEX = 2;
        let i = DUPLICATE_PLOT_START_INDEX;
        while (titles.includes(`${plotTitle}_${i}`)) i += 1;
        plots[plotId] = `${plotTitle}_${i}`;
      } else plots[plotId] = plotTitle;
    });

    data.result.metaInfo.plots.forEach((plot) => {
      if (!plot.target) return;
      plots[plot.id] = `${plots[plot.target] ?? plot.target}_${plot.type}`;
    });

    return new PineIndicator({
      pineId: data.result.metaInfo.scriptIdPart || indicID,
      pineVersion: data.result.metaInfo.pine.version || version,
      description: data.result.metaInfo.description,
      shortDescription: data.result.metaInfo.shortDescription,
      inputs,
      plots,
      script: data.result.ilTemplate,
    });
  },

  /**
   * @typedef {Object} User Instance of User
   * @prop {number} id User ID
   * @prop {string} username User username
   * @prop {string} firstName User first name
   * @prop {string} lastName User last name
   * @prop {number} reputation User reputation
   * @prop {number} following Number of following accounts
   * @prop {number} followers Number of followers
   * @prop {Object} notifications User's notifications
   * @prop {number} notifications.user User notifications
   * @prop {number} notifications.following Notification from following accounts
   * @prop {string} session User session
   * @prop {string} sessionHash User session hash
   * @prop {string} signature User session signature
   * @prop {string} privateChannel User private channel
   * @prop {string} authToken User auth token
   * @prop {Date} joinDate Account creation date
   */

  /**
   * Get user and sessionid from username/email and password
   * @function loginUser
   * @param {string} username User username/email
   * @param {string} password User password
   * @param {boolean} [remember] Remember the session (default: false)
   * @param {string} [UA] Custom UserAgent
   * @returns {Promise<User>} Token
   */
  async loginUser(username, password, remember = true, UA = 'TWAPI/3.0') {
    const { data, headers } = await axios.post(
      'https://www.tradingview.com/accounts/signin/',
      `username=${username}&password=${password}${remember ? '&remember=on' : ''}`,
      {
        headers: {
          referer: 'https://www.tradingview.com',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-agent': `${UA} (${os.version()}; ${os.platform()}; ${os.arch()})`,
        },
        validateStatus,
      },
    );

    const cookies = headers['set-cookie'];

    if (data.error) throw new Error(data.error);

    const sessionCookie = cookies.find((c) => c.includes('sessionid='));
    const session = (sessionCookie.match(/sessionid=(.*?);/) ?? [])[1];

    const signCookie = cookies.find((c) => c.includes('sessionid_sign='));
    const signature = (signCookie.match(/sessionid_sign=(.*?);/) ?? [])[1];

    return {
      id: data.user.id,
      username: data.user.username,
      firstName: data.user.first_name,
      lastName: data.user.last_name,
      reputation: data.user.reputation,
      following: data.user.following,
      followers: data.user.followers,
      notifications: data.user.notification_count,
      session,
      signature,
      sessionHash: data.user.session_hash,
      privateChannel: data.user.private_channel,
      authToken: data.user.auth_token,
      joinDate: new Date(data.user.date_joined),
    };
  },

  /**
   * Get user from 'sessionid' cookie
   * @function getUser
   * @param {string} session User 'sessionid' cookie
   * @param {string} [signature] User 'sessionid_sign' cookie
   * @param {string} [location] Auth page location (For france: https://fr.tradingview.com/)
   * @param {number} [_redirectDepth] Internal: redirect depth (do not use)
   * @returns {Promise<User>} Token
   */
  async getUser(session, signature = '', location = 'https://www.tradingview.com/', _redirectDepth = 0) {
    const maxRedirects = 10;
    if (_redirectDepth > maxRedirects) {
      throw new Error('Too many redirects while fetching TradingView user');
    }

    const { data, headers } = await axios.get(location, {
      headers: {
        cookie: genAuthCookies(session, signature),
      },
      maxRedirects: 0,
      validateStatus,
    });

    if (data.includes('auth_token')) {
      // Parse user data from HTML response with safe integer conversion
      const parseIntSafe = (str, defaultValue = 0) => {
        const parsed = parseInt(str, 10);
        return Number.isNaN(parsed) ? defaultValue : parsed;
      };
      
      const parseFloatSafe = (str, defaultValue = 0) => {
        const parsed = parseFloat(str);
        return Number.isNaN(parsed) ? defaultValue : parsed;
      };

      return {
        id: parseIntSafe(/"id":([0-9]{1,10}),/.exec(data)?.[1]),
        username: /"username":"(.*?)"/.exec(data)?.[1],
        firstName: /"first_name":"(.*?)"/.exec(data)?.[1],
        lastName: /"last_name":"(.*?)"/.exec(data)?.[1],
        reputation: parseFloatSafe(/"reputation":(.*?),/.exec(data)?.[1]),
        following: parseIntSafe(/,"following":([0-9]*?),/.exec(data)?.[1]),
        followers: parseIntSafe(/,"followers":([0-9]*?),/.exec(data)?.[1]),
        notifications: {
          following: parseIntSafe(/"notification_count":\{"following":([0-9]*),/.exec(data)?.[1]),
          user: parseIntSafe(/"notification_count":\{"following":[0-9]*,"user":([0-9]*)/.exec(data)?.[1]),
        },
        session,
        signature,
        sessionHash: /"session_hash":"(.*?)"/.exec(data)?.[1],
        privateChannel: /"private_channel":"(.*?)"/.exec(data)?.[1],
        authToken: /"auth_token":"(.*?)"/.exec(data)?.[1],
        joinDate: new Date(/"date_joined":"(.*?)"/.exec(data)?.[1] || 0),
      };
    }

    if (headers.location && headers.location !== location) {
      return this.getUser(session, signature, headers.location, _redirectDepth + 1);
    }

    throw new Error('Wrong or expired sessionid/signature');
  },

  /**
   * Get user's private indicators from a 'sessionid' cookie
   * @function getPrivateIndicators
   * @param {string} session User 'sessionid' cookie
   * @param {string} [signature] User 'sessionid_sign' cookie
   * @returns {Promise<SearchIndicatorResult[]>} Search results
   */
  async getPrivateIndicators(session, signature = '') {
    const { data } = await axios.get(
      'https://pine-facade.tradingview.com/pine-facade/list',
      {
        headers: {
          cookie: genAuthCookies(session, signature),
        },
        params: {
          filter: 'saved',
        },
        validateStatus,
      },
    );

    // Map function for private indicators
    const mapPrivateIndicator = (ind) => ({
      id: ind.scriptIdPart,
      version: ind.version,
      name: ind.scriptName,
      author: {
        id: -1,
        username: '@ME@',
      },
      image: ind.imageUrl,
      access: 'private',
      source: ind.scriptSource,
      type: (ind.extra && ind.extra.kind) ? ind.extra.kind : 'study',
      get() {
        return module.exports.getIndicator(
          ind.scriptIdPart,
          ind.version,
          session,
          signature,
        );
      },
    });

    return data.map(mapPrivateIndicator);
  },

  /**
   * User credentials
   * @typedef {Object} UserCredentials
   * @prop {number} id User ID
   * @prop {string} session User session ('sessionid' cookie)
   * @prop {string} [signature] User session signature ('sessionid_sign' cookie)
   */

  /**
   * Get a chart token from a layout ID and the user credentials if the layout is not public
   * @function getChartToken
   * @param {string} layout The layout ID found in the layout URL (Like: 'XXXXXXXX')
   * @param {UserCredentials} [credentials] User credentials (id + session + [signature])
   * @returns {Promise<string>} Token
   */
  async getChartToken(layout, credentials = {}) {
    const { id, session, signature } = (
      credentials.id && credentials.session
        ? credentials
        : { id: -1, session: null, signature: null }
    );

    const { data } = await axios.get(
      'https://www.tradingview.com/chart-token',
      {
        headers: {
          cookie: genAuthCookies(session, signature),
        },
        params: {
          image_url: layout,
          user_id: id,
        },
        validateStatus,
      },
    );

    if (!data.token) throw new Error('Wrong layout or credentials');

    return data.token;
  },

  /**
   * @typedef {Object} DrawingPoint Drawing poitn
   * @prop {number} time_t Point X time position
   * @prop {number} price Point Y price position
   * @prop {number} offset Point offset
   */

  /**
   * @typedef {Object} Drawing
   * @prop {string} id Drawing ID (Like: 'XXXXXX')
   * @prop {string} symbol Layout market symbol (Like: 'BINANCE:BUCEUR')
   * @prop {string} ownerSource Owner user ID (Like: 'XXXXXX')
   * @prop {string} serverUpdateTime Drawing last update timestamp
   * @prop {string} currencyId Currency ID (Like: 'EUR')
   * @prop {any} unitId Unit ID
   * @prop {string} type Drawing type
   * @prop {DrawingPoint[]} points List of drawing points
   * @prop {number} zorder Drawing Z order
   * @prop {string} linkKey Drawing link key
   * @prop {Object} state Drawing state
   */

  /**
   * Get a chart token from a layout ID and the user credentials if the layout is not public
   * @function getDrawings
   * @param {string} layout The layout ID found in the layout URL (Like: 'XXXXXXXX')
   * @param {string | ''} [symbol] Market filter (Like: 'BINANCE:BTCEUR')
   * @param {UserCredentials} [credentials] User credentials (id + session + [signature])
   * @param {number} [chartID] Chart ID
   * @returns {Promise<Drawing[]>} Drawings
   */
  async getDrawings(layout, symbol = '', credentials = {}, chartID = '_shared') {
    const chartToken = await module.exports.getChartToken(layout, credentials);

    const { data } = await axios.get(
      `https://charts-storage.tradingview.com/charts-storage/get/layout/${
        layout
      }/sources`,
      {
        params: {
          chart_id: chartID,
          jwt: chartToken,
          symbol,
        },
        validateStatus,
      },
    );

    if (!data.payload) throw new Error('Wrong layout, user credentials, or chart id.');

    // Map function to merge drawing with its state
    const mapDrawing = (drawing) => ({ ...drawing, ...drawing.state });

    return Object.values(data.payload.sources || {}).map(mapDrawing);
  },
};
