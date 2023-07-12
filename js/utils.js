const crypto = require('crypto');

/**
 * Generates a random v4 UUID from the native Node.js crypto function.
 *
 * @returns String - A random v4 UUID
 */
function generateUUID() {
  return crypto.randomUUID();
} // generateUUID

/**
 * Helper function for getting an import whether from a lmabda layer or
 * a relative path.
 *
 * @param {String} path1 - The first path to try to import
 * @param {String} path2 - The seecond path to try to import
 * @returns The imported package
 */
function getImport(path1, path2) {
  try {
    return require(path1);
  } catch (e) {
    return require(path2);
  }
} // getImport

module.exports = {
  generateUUID,
  getImport
};
