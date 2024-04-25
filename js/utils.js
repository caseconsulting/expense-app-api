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
      jwksUri: `https://${process.env.VITE_AUTH0_DOMAIN}/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer.
    audience: process.env.VITE_AUTH0_AUDIENCE,
    issuer: `https://${process.env.VITE_AUTH0_DOMAIN}/`,
    algorithms: ['RS256']
  });
}

/**
 * Sends an email using AWS SES.
 *
 * @param {String} source - The source email address
 * @param {Array} toAddresses - The array of address to send the email to
 * @param {*} subject - The subject of the email
 * @param {*} body - The body of the email
 * @param {*} isHtml - Whether or not the body of the email is formatted with HTML
 * @returns Promise - The result of the email that is attempted to send
 */
async function sendEmail(source, toAddresses, subject, body, isHtml = false) {
  const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
  const sesClient = new SESClient({ region: 'us-east-1' });
  let emailCommand = new SendEmailCommand({
    Source: source,
    Destination: {
      ToAddresses: toAddresses
    },
    Message: {
      Subject: {
        Charset: 'UTF-8',
        Data: subject
      },
      Body: {
        [isHtml ? 'Html' : 'Text']: {
          Chartset: 'UTF-8',
          Data: body
        }
      }
    }
  });
  return await sesClient.send(emailCommand);
} // sendEmail

module.exports = {
  asyncForEach,
  generateUUID,
  getExpressJwt,
  sendEmail
};
