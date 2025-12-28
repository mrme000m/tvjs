const { validateSymbol, validateSession } = require('../validators');
const { SymbolError } = require('../errors');
const { isDebugEnabled } = require('../config');

/**
 * @typedef {'loaded' | 'data' | 'error'} MarketEvent
 */

/**
 * @param {import('./session').QuoteSessionBridge} quoteSession
 */

module.exports = (quoteSession) => class QuoteMarket {
  #symbolListeners = quoteSession.symbolListeners;

  #symbol;

  #session;

  #symbolKey;

  #symbolListenerID = 0;

  /** @type {((packet: any) => void) | null} */
  #symbolListener = null;

  #lastData = {};

  #callbacks = {
    loaded: [],
    data: [],

    event: [],
    error: [],
  };

  #removeCallback(ev, cb) {
    const arr = this.#callbacks[ev];
    const idx = arr.indexOf(cb);
    if (idx !== -1) arr.splice(idx, 1);
  }

  /**
   * @param {MarketEvent} ev Client event
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
   * @param {string} symbol Market symbol (like: 'BTCEUR' or 'KRAKEN:BTCEUR')
   * @param {string} session Market session (like: 'regular' or 'extended')
   */
  constructor(symbol, session = 'regular') {
    // Validate inputs
    try {
      validateSymbol(symbol, 'symbol');
      validateSession(session, 'session');
    } catch (error) {
      this.#handleError(error);
      throw error;
    }

    this.#symbol = symbol;
    this.#session = session;
    this.#symbolKey = `=${JSON.stringify({ session, symbol })}`;

    if (!this.#symbolListeners[this.#symbolKey]) {
      this.#symbolListeners[this.#symbolKey] = [];
      quoteSession.send('quote_add_symbols', [
        quoteSession.sessionID,
        this.#symbolKey,
      ]);
    }

    const listeners = this.#symbolListeners[this.#symbolKey];
    const freeSlot = listeners.findIndex((l) => !l);
    this.#symbolListenerID = freeSlot === -1 ? listeners.length : freeSlot;

    this.#symbolListener = (packet) => {
      if (isDebugEnabled()) console.log('§90§30§105 MARKET §0 DATA', packet);

      if (packet.type === 'qsd' && packet.data[1].s === 'ok') {
        this.#lastData = {
          ...this.#lastData,
          ...packet.data[1].v,
        };
        this.#handleEvent('data', this.#lastData);
        return;
      }

      if (packet.type === 'quote_completed') {
        this.#handleEvent('loaded');
        return;
      }

      if (packet.type === 'qsd' && packet.data[1].s === 'error') {
        const error = new SymbolError('Market error', this.#symbol, packet.data);
        this.#handleError(error, 'Market error', packet.data);
      }
    };

    listeners[this.#symbolListenerID] = this.#symbolListener;
  }

  /**
   * When quote market is loaded
   * @param {() => void} cb Callback
   * @event
   */
  onLoaded(cb) {
    this.#callbacks.loaded.push(cb);
    return () => this.#removeCallback('loaded', cb);
  }

  /**
   * When quote data is received
   * @param {(data: {}) => void} cb Callback
   * @event
   */
  onData(cb) {
    this.#callbacks.data.push(cb);
    return () => this.#removeCallback('data', cb);
  }

  /**
   * When quote event happens
   * @param {(...any) => void} cb Callback
   * @event
   */
  onEvent(cb) {
    this.#callbacks.event.push(cb);
    return () => this.#removeCallback('event', cb);
  }

  /**
   * When quote error happens
   * @param {(...any) => void} cb Callback
   * @event
   */
  onError(cb) {
    this.#callbacks.error.push(cb);
    return () => this.#removeCallback('error', cb);
  }

  /** Close this listener */
  close() {
    const listeners = this.#symbolListeners[this.#symbolKey];
    if (!listeners) return;

    if (listeners[this.#symbolListenerID] === this.#symbolListener) {
      listeners[this.#symbolListenerID] = null;
    }
    this.#symbolListener = null;

    // If no active listeners remain, unsubscribe from the symbol entirely.
    const hasActive = listeners.some((l) => !!l);
    if (!hasActive) {
      quoteSession.send('quote_remove_symbols', [
        quoteSession.sessionID,
        this.#symbolKey,
      ]);
      delete this.#symbolListeners[this.#symbolKey];
      return;
    }
  }
};
