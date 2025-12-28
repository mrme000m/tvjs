const WebSocket = require('ws');

const misc = require('./miscRequests');
const protocol = require('./protocol');
const { ConnectionError, AuthenticationError } = require('./errors');
const { setDebug, isDebugEnabled } = require('./config');

const quoteSessionGenerator = require('./quote/session');
const chartSessionGenerator = require('./chart/session');

/**
 * @typedef {Object} Session
 * @prop {'quote' | 'chart' | 'replay'} type Session type
 * @prop {(data: {}) => null} onData When there is a data
 */

/** @typedef {Object<string, Session>} SessionList Session list */

/**
 * @callback SendPacket Send a custom packet
 * @param {string} t Packet type
 * @param {string[]} p Packet data
 * @returns {void}
*/

/**
 * @typedef {Object} ClientBridge
 * @prop {SessionList} sessions
 * @prop {SendPacket} send
 */

/**
 * @typedef { 'connected' | 'disconnected'
 *  | 'logged' | 'ping' | 'data'
 *  | 'error' | 'event'
 * } ClientEvent
 */

/** @class */
module.exports = class Client {
  #ws;

  #logged = false;

  #isShuttingDown = false;

  #authPromise;

  #reconnectAttempts = 0;
  #maxReconnectAttempts = 5;
  #reconnectDelay = 5000; // 5 seconds
  #connectionTimeout = 10000; // 10 seconds
  #pingInterval = null;
  #lastPingTime = Date.now();
  #pingTimeout = null;
  #pingTimeoutDuration = 30000; // 30 seconds

  /** If the client is logged in */
  get isLogged() {
    return this.#logged;
  }

  /** If the cient was closed */
  get isOpen() {
    return this.#ws.readyState === this.#ws.OPEN;
  }

  /** @type {SessionList} */
  #sessions = {};

  #callbacks = {
    connected: [],
    disconnected: [],
    logged: [],
    ping: [],
    data: [],

    error: [],
    event: [],
  };

  /** @param {ClientEvent} ev */
  #removeCallback(ev, cb) {
    const arr = this.#callbacks[ev];
    const idx = arr.indexOf(cb);
    if (idx !== -1) arr.splice(idx, 1);
  }

  #handshakeReceived = false;

  /**
   * @param {ClientEvent} ev Client event
   * @param {...{}} data Packet data
   */
  #handleEvent(ev, ...data) {
    this.#callbacks[ev].forEach((e) => e(...data));
    this.#callbacks.event.forEach((e) => e(ev, ...data));
  }

  #handleError(...msgs) {
    const errorObj = msgs[0] instanceof Error ? msgs[0] : new Error(msgs.join(' '));
    if (this.#callbacks.error.length === 0) console.error(...msgs);
    else this.#handleEvent('error', errorObj, ...msgs.slice(1));
  }

  /**
   * When client is connected
   * @param {() => void} cb Callback
   * @event onConnected
   */
  onConnected(cb) {
    this.#callbacks.connected.push(cb);
    return () => this.#removeCallback('connected', cb);
  }

  /**
   * When client is disconnected
   * @param {() => void} cb Callback
   * @event onDisconnected
   */
  onDisconnected(cb) {
    this.#callbacks.disconnected.push(cb);
    return () => this.#removeCallback('disconnected', cb);
  }

  /**
   * @typedef {Object} SocketSession
   * @prop {string} session_id Socket session ID
   * @prop {number} timestamp Session start timestamp
   * @prop {number} timestampMs Session start milliseconds timestamp
   * @prop {string} release Release
   * @prop {string} studies_metadata_hash Studies metadata hash
   * @prop {'json' | string} protocol Used protocol
   * @prop {string} javastudies Javastudies
   * @prop {number} auth_scheme_vsn Auth scheme type
   * @prop {string} via Socket IP
   */

  /**
   * When client is logged
   * @param {(SocketSession: SocketSession) => void} cb Callback
   * @event onLogged
   */
  onLogged(cb) {
    this.#callbacks.logged.push(cb);
    return () => this.#removeCallback('logged', cb);
  }

  /**
   * When server is pinging the client
   * @param {(i: number) => void} cb Callback
   * @event onPing
   */
  onPing(cb) {
    this.#callbacks.ping.push(cb);
    return () => this.#removeCallback('ping', cb);
  }

  /**
   * When unparsed data is received
   * @param {(...{}) => void} cb Callback
   * @event onData
   */
  onData(cb) {
    this.#callbacks.data.push(cb);
    return () => this.#removeCallback('data', cb);
  }

  /**
   * When a client error happens
   * @param {(...{}) => void} cb Callback
   * @event onError
   */
  onError(cb) {
    this.#callbacks.error.push(cb);
    return () => this.#removeCallback('error', cb);
  }

  /**
   * When a client event happens
   * @param {(...{}) => void} cb Callback
   * @event onEvent
   */
  onEvent(cb) {
    this.#callbacks.event.push(cb);
    return () => this.#removeCallback('event', cb);
  }

  #parsePacket(str) {
    if (!this.isOpen) return;

    protocol.parseWSPacket(str).forEach((packet) => {
      if (isDebugEnabled()) console.log('§90§30§107 CLIENT §0 PACKET', packet);
      if (typeof packet === 'number') { // Ping
        this.#ws.send(protocol.formatWSPacket(`~h~${packet}`));
        this.#handleEvent('ping', packet);
        return;
      }

      // TradingView sends a handshake payload containing the socket session.
      // Emit it once via onLogged, regardless of auth mode.
      if (!this.#handshakeReceived && packet && typeof packet === 'object' && packet.session_id) {
        this.#handshakeReceived = true;
        this.#handleEvent('logged', packet);
      }

      // Before auth token is ready (for credentialed clients), ignore non-ping traffic.
      if (!this.#logged) return;

      if (packet.m === 'protocol_error') { // Error
        const error = new ConnectionError('Client protocol error', packet.p);
        this.#handleError(error, packet.p);
        this.#ws.close();
        return;
      }

      if (packet.m && packet.p) { // Normal packet
        const parsed = {
          type: packet.m,
          data: packet.p,
        };

        const session = packet.p[0];

        if (session && this.#sessions[session]) {
          this.#sessions[session].onData(parsed);
          return;
        }
      }

      this.#handleEvent('data', packet);
    });
  }

  #sendQueue = [];

  /** @type {SendPacket} Send a custom packet */
  send(t, p = []) {
    this.#sendQueue.push(protocol.formatWSPacket({ m: t, p }));
    this.sendQueue();
  }

  /** Send all waiting packets */
  sendQueue() {
    while (this.isOpen && this.#logged && this.#sendQueue.length > 0) {
      const packet = this.#sendQueue.shift();
      this.#ws.send(packet);
      if (isDebugEnabled()) console.log('§90§30§107 > §0', packet);
    }
  }

  /**
   * @typedef {Object} ClientOptions
   * @prop {string} [token] User auth token (in 'sessionid' cookie)
   * @prop {string} [signature] User auth token signature (in 'sessionid_sign' cookie)
   * @prop {boolean} [debug] Enable debug mode
   * @prop {'data' | 'prodata' | 'widgetdata'} [server] Server type
   * @prop {string} [location] Auth page location (For france: https://fr.tradingview.com/)
   */

  /**
   * Client object
   * @param {ClientOptions} clientOptions TradingView client options
   */
  constructor(clientOptions = {}) {
    if (clientOptions.debug !== undefined) setDebug(clientOptions.debug);
    // Support legacy DEBUG option (uppercase)
    if (clientOptions.DEBUG !== undefined) setDebug(clientOptions.DEBUG);

    const server = clientOptions.server || 'data';

    // Create WebSocket with connection timeout
    this.#ws = new WebSocket(`wss://${server}.tradingview.com/socket.io/websocket?type=chart`, {
      origin: 'https://www.tradingview.com',
    });

    // Set up connection timeout
    const connectionTimer = setTimeout(() => {
      if (this.#ws.readyState === WebSocket.CONNECTING) {
        this.#handleError('Connection timeout');
        this.#ws.terminate(); // Force close the connection
      }
    }, this.#connectionTimeout);

    // Authentication will be handled after WebSocket connects
    this.#authPromise = clientOptions.token
      ? misc.getUser(
        clientOptions.token,
        clientOptions.signature ? clientOptions.signature : '',
        clientOptions.location ? clientOptions.location : 'https://tradingview.com',
      ).then((user) => ({
        m: 'set_auth_token',
        p: [user.authToken],
      })).catch((err) => {
        const authError = new AuthenticationError('Credentials error', err.message);
        this.#handleError(authError, err.message);
        throw authError;
      })
      : Promise.resolve({
        m: 'set_auth_token',
        p: ['unauthorized_user_token'],
      });

    this.#ws.on('open', () => {
      // Clear connection timeout on successful connection
      clearTimeout(connectionTimer);
      this.#reconnectAttempts = 0; // Reset reconnect attempts on successful connection

      // Handle authentication after connection is established
      this.#authPromise.then((authPacket) => {
        if (this.#isShuttingDown) return;
        this.#sendQueue.unshift(protocol.formatWSPacket(authPacket));
        this.#logged = true;
        this.#handleEvent('connected');
        this.sendQueue();

        // Start ping/pong health monitoring
        this.#startPingMonitoring();
      }).catch(() => {
        // Error already handled in #authPromise
        this.#ws.close();
      });
    });

    this.#ws.on('close', (code, reason) => {
      // Clear ping monitoring when connection closes
      this.#stopPingMonitoring();

      this.#logged = false;
      this.#handleEvent('disconnected');

      // Implement retry logic
      if (!this.#isShuttingDown && this.#reconnectAttempts < this.#maxReconnectAttempts) {
        this.#reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.#reconnectAttempts}/${this.#maxReconnectAttempts})...`);

        setTimeout(() => {
          console.log('Reconnecting...');
          this.#reconnect(clientOptions);
        }, this.#reconnectDelay);
      } else {
        console.log('Max reconnection attempts reached or client is shutting down.');
      }
    });

    this.#ws.on('error', (err) => {
      const error = new ConnectionError('WebSocket error', err.message);
      this.#handleError(error, err.message);
    });

    this.#ws.on('message', (data) => this.#parsePacket(data));
  }

  /**
   * Reconnect to the WebSocket server
   * @param {ClientOptions} clientOptions TradingView client options
   */
  #reconnect(clientOptions) {
    if (this.#isShuttingDown) return;

    console.log('Creating new WebSocket connection...');

    const server = clientOptions.server || 'data';
    this.#ws = new WebSocket(`wss://${server}.tradingview.com/socket.io/websocket?type=chart`, {
      origin: 'https://www.tradingview.com',
    });

    // Set up connection timeout for reconnection
    const connectionTimer = setTimeout(() => {
      if (this.#ws.readyState === WebSocket.CONNECTING) {
        this.#handleError('Reconnection timeout');
        this.#ws.terminate();
      }
    }, this.#connectionTimeout);

    this.#ws.on('open', () => {
      // Clear connection timeout on successful connection
      clearTimeout(connectionTimer);
      this.#reconnectAttempts = 0; // Reset reconnect attempts on successful connection

      // Handle authentication after connection is established
      this.#authPromise = clientOptions.token
        ? misc.getUser(
          clientOptions.token,
          clientOptions.signature ? clientOptions.signature : '',
          clientOptions.location ? clientOptions.location : 'https://tradingview.com',
        ).then((user) => ({
          m: 'set_auth_token',
          p: [user.authToken],
        })).catch((err) => {
          const authError = new AuthenticationError('Credentials error', err.message);
          this.#handleError(authError, err.message);
          throw authError;
        })
        : Promise.resolve({
          m: 'set_auth_token',
          p: ['unauthorized_user_token'],
        });

      this.#authPromise.then((authPacket) => {
        if (this.#isShuttingDown) return;
        this.#sendQueue.unshift(protocol.formatWSPacket(authPacket));
        this.#logged = true;
        this.#handleEvent('connected');
        this.sendQueue();

        // Start ping/pong health monitoring
        this.#startPingMonitoring();
      }).catch(() => {
        // Error already handled in #authPromise
        this.#ws.close();
      });
    });

    this.#ws.on('close', (code, reason) => {
      // Clear ping monitoring when connection closes
      this.#stopPingMonitoring();

      this.#logged = false;
      this.#handleEvent('disconnected');

      // Implement retry logic
      if (!this.#isShuttingDown && this.#reconnectAttempts < this.#maxReconnectAttempts) {
        this.#reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.#reconnectAttempts}/${this.#maxReconnectAttempts})...`);

        setTimeout(() => {
          console.log('Reconnecting...');
          this.#reconnect(clientOptions);
        }, this.#reconnectDelay);
      } else {
        console.log('Max reconnection attempts reached or client is shutting down.');
      }
    });

    this.#ws.on('error', (err) => {
      const error = new ConnectionError('WebSocket error', err.message);
      this.#handleError(error, err.message);
    });

    this.#ws.on('message', (data) => this.#parsePacket(data));
  }

  /**
   * Start ping/pong health monitoring
   */
  #startPingMonitoring() {
    // Clear any existing ping interval
    if (this.#pingInterval) {
      clearInterval(this.#pingInterval);
    }

    // Set up ping interval to send ping every 30 seconds
    this.#pingInterval = setInterval(() => {
      if (this.isOpen) {
        // Send a ping to the server
        this.#ws.ping();
        this.#lastPingTime = Date.now();

        // Set up timeout to detect if ping response doesn't come back
        if (this.#pingTimeout) {
          clearTimeout(this.#pingTimeout);
        }

        this.#pingTimeout = setTimeout(() => {
          if (this.isOpen) {
            console.log('Ping timeout - connection may be dead, attempting to close and reconnect');
            this.#ws.terminate(); // Force close the connection
          }
        }, this.#pingTimeoutDuration);
      }
    }, 30000); // Ping every 30 seconds

    // Handle pong response
    this.#ws.on('pong', () => {
      if (this.#pingTimeout) {
        clearTimeout(this.#pingTimeout);
      }
      this.#lastPingTime = Date.now();
      if (isDebugEnabled()) {
        console.log('Received pong from server');
      }
    });

    // Handle ping from server
    this.#ws.on('ping', () => {
      if (this.isOpen) {
        this.#ws.pong(); // Respond with pong
      }
    });
  }

  /**
   * Stop ping/pong health monitoring
   */
  #stopPingMonitoring() {
    if (this.#pingInterval) {
      clearInterval(this.#pingInterval);
      this.#pingInterval = null;
    }

    if (this.#pingTimeout) {
      clearTimeout(this.#pingTimeout);
      this.#pingTimeout = null;
    }
  }

  /** @type {ClientBridge} */
  #clientBridge = {
    sessions: this.#sessions,
    send: (t, p) => this.send(t, p),
  };

  /** @namespace Session */
  Session = {
    Quote: quoteSessionGenerator(this.#clientBridge),
    Chart: chartSessionGenerator(this.#clientBridge),
  };

  /**
   * Close the websocket connection
   * @return {Promise<void>} When websocket is closed
   */
  end() {
    return new Promise((resolve) => {
      this.#isShuttingDown = true;

      // Clean up all sessions before closing
      Object.keys(this.#sessions).forEach((sessionId) => {
        delete this.#sessions[sessionId];
      });

      // Clear all callbacks to prevent memory leaks
      Object.keys(this.#callbacks).forEach((event) => {
        this.#callbacks[event] = [];
      });

      // Clear send queue
      this.#sendQueue = [];

      if (!this.#ws) {
        resolve();
        return;
      }

      // If already closed/closing, just wait for the close event once.
      if (this.#ws.readyState === this.#ws.CLOSED) {
        resolve();
        return;
      }

      const done = () => {
        // Remove all WebSocket listeners to prevent memory leaks
        this.#ws.removeAllListeners();
        resolve();
      };
      this.#ws.once('close', done);

      if (this.#ws.readyState === this.#ws.OPEN || this.#ws.readyState === this.#ws.CONNECTING) {
        try {
          this.#ws.close();
        } catch (_) {
          // If close throws (rare), resolve anyway; caller intends shutdown.
          done();
        }
      }
    });
  }
};
