const crypto = require('crypto');

/**
 * Generates a random v4 UUID from the native Node.js crypto function.
 *
 * @returns String - A random v4 UUID
 */
function generateUUID() {
  return crypto.randomUUID();
} // generateUUID

module.exports = {
  generateUUID
};
