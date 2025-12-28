// Constants
const SESSION_ID_LENGTH = 12;
const SESSION_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

module.exports = {
  /**
   * Generates a session id
   * @function genSessionID
   * @param {String} type Session type
   * @returns {string}
   */
  genSessionID(type = 'xs') {
    let r = '';
    for (let i = 0; i < SESSION_ID_LENGTH; i += 1) {
      r += SESSION_ID_CHARS.charAt(Math.floor(Math.random() * SESSION_ID_CHARS.length));
    }
    return `${type}_${r}`;
  },

  genAuthCookies(sessionId = '', signature = '') {
    if (!sessionId) return '';
    if (!signature) return `sessionid=${sessionId}`;
    return `sessionid=${sessionId};sessionid_sign=${signature}`;
  },
};
