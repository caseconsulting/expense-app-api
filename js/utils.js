/**
 * Async function to loop an array.
*
* @param array - Array of elements to iterate over
* @param callback - callback function
*/
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
} // asyncForEach

/**
 * Generates a random v4 UUID from the native Node.js crypto function.
*
* @returns String - A random v4 UUID
*/
function generateUUID() {
  const crypto = require('crypto');
  return crypto.randomUUID();
} // generateUUID

/**
 * Generate expressJWT toekn
 */
function getExpressJwt() {
  const jwksRsa = require('jwks-rsa');
  const { expressjwt } = require('express-jwt');
  
  return expressjwt({
  // Dynamically provide a signing key based on the kid in the header and the signing keys provided by the JWKS
  // endpoint.
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://${process.env.VUE_APP_AUTH0_DOMAIN}/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer.
    audience: process.env.VUE_APP_AUTH0_AUDIENCE,
    issuer: `https://${process.env.VUE_APP_AUTH0_DOMAIN}/`,
    algorithms: ['RS256']
  });
}

module.exports = {
  asyncForEach,
  generateUUID,
  getExpressJwt
};
