const JSZip = require('jszip');
const { ProtocolError } = require('./errors');
const { isDebugEnabled } = require('./config');

/**
 * @typedef {Object} TWPacket
 * @prop {string} [m] Packet type
 * @prop {[session: string, {}]} [p] Packet data
 */

const cleanerRgx = /~h~/g;
const splitterRgx = /~m~\d+~m~/g;

module.exports = {
  /**
   * Parse websocket packet
   * @function parseWSPacket
   * @param {string} str Websocket raw data
   * @returns {TWPacket[]} TradingView packets
   */
  parseWSPacket(str) {
    return str.replace(cleanerRgx, '').split(splitterRgx)
      .map((p) => {
        if (!p) return false;
        try {
          return JSON.parse(p);
        } catch (error) {
          const CHUNK_PREVIEW_LENGTH = 200;
          const parseError = new ProtocolError(
            'Failed to parse WebSocket chunk',
            {
              originalError: error?.message ?? String(error),
              chunkLength: p.length,
              chunkPreview: p.slice(0, CHUNK_PREVIEW_LENGTH),
            },
          );
          
          // Log warning but don't throw - allow other packets to process
          console.warn('ProtocolError:', parseError.message, parseError.details);
          if (isDebugEnabled()) {
            console.warn('Chunk preview:', parseError.details.chunkPreview);
          }
          return false;
        }
      })
      .filter((p) => p);
  },

  /**
   * Format websocket packet
   * @function formatWSPacket
   * @param {TWPacket} packet TradingView packet
   * @returns {string} Websocket raw data
   */
  formatWSPacket(packet) {
    const msg = typeof packet === 'object'
      ? JSON.stringify(packet)
      : packet;
    return `~m~${msg.length}~m~${msg}`;
  },

  /**
   * Parse compressed data
   * @function parseCompressed
   * @param {string} data Compressed data
   * @returns {Promise<{}>} Parsed data
   */
  async parseCompressed(data) {
    try {
      const zip = new JSZip();
      const loaded = await zip.loadAsync(data, { base64: true });

      // Some payloads use an empty filename, others may use an arbitrary name.
      const emptyName = loaded.file('');
      const firstName = Object.keys(loaded.files ?? {})[0];
      const firstFile = firstName ? loaded.file(firstName) : null;
      const file = emptyName ?? firstFile;

      if (!file) {
        throw new ProtocolError('Compressed payload contained no files', {
          availableFiles: Object.keys(loaded.files ?? {}),
        });
      }

      const text = await file.async('text');
      return JSON.parse(text);
    } catch (error) {
      if (error instanceof ProtocolError) {
        throw error;
      }
      
      throw new ProtocolError(
        'Failed to parse compressed data',
        {
          originalError: error?.message ?? String(error),
          dataLength: data?.length,
        },
      );
    }
  },
};
