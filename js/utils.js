const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const logger = new Logger('tSheetsRoutes');
const lambdaClient = new LambdaClient();

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
} // getExpressJwt

/**
 * Invokes lambda function with given params
 *
 * @param params - params to invoke lambda function with
 * @return object if successful, error otherwise
 */
async function invokeLambda(params) {
  const command = new InvokeCommand(params);
  const resp = await lambdaClient.send(command);
  return JSON.parse(Buffer.from(resp.Payload));
} // invokeLambda

/**
 * Check if an employee is an admin. Returns true if employee role is 'admin', otherwise returns false.
 *
 * @param employee - Employee to check
 * @return boolean - employee is admin
 */
function isAdmin(employee) {
  // log method
  logger.log(5, 'isAdmin', `Checking if employee ${employee.id} is an admin`);

  // compute method
  let result = employee.employeeRole === 'admin';

  // log result
  if (result) {
    logger.log(5, 'isAdmin', `Employee ${employee.id} is an admin`);
  } else {
    logger.log(5, 'isAdmin', `Employee ${employee.id} is not an admin`);
  }

  // return result
  return result;
} // isAdmin

/**
 * Check if an employee is an intern. Returns true if employee role is 'intern', otherwise returns false.
 *
 * @param employee - Employee to check
 * @return boolean - employee is intern
 */
function isIntern(employee) {
  // log method
  logger.log(5, 'isIntern', `Checking if employee ${employee.id} is an intern`);

  // compute method
  let result = employee.employeeRole === 'intern';

  // log result
  if (result) {
    logger.log(5, 'isIntern', `Employee ${employee.id} is an intern`);
  } else {
    logger.log(5, 'isIntern', `Employee ${employee.id} is not an intern`);
  }

  // return result
  return result;
} // isIntern

/**
 * Check if an employee is a user. Returns true if employee role is 'user', otherwise returns false.
 *
 * @param employee - Employee to check
 * @return boolean - employee is user
 */
function isUser(employee) {
  // log method
  logger.log(5, 'isUser', `Checking if employee ${employee.id} is a user`);

  // compute method
  let result = employee.employeeRole === 'user';

  // log result
  if (result) {
    logger.log(5, 'isUser', `Employee ${employee.id} is a user`);
  } else {
    logger.log(5, 'isUser', `Employee ${employee.id} is not a user`);
  }

  // return result
  return result;
} // isUser

/**
 * Check if an employee is a manager. Returns true if employee role is 'manager', otherwise returns false.
 *
 * @param employee - Employee to check
 * @return boolean - employee is manager
 */
function isManager(employee) {
  // log method
  logger.log(5, 'isManager', `Checking if employee ${employee.id} is a manager`);

  // compute method
  let result = employee.employeeRole === 'manager';

  // log result
  if (result) {
    logger.log(5, 'isManager', `Employee ${employee.id} is a manager`);
  } else {
    logger.log(5, 'isManager', `Employee ${employee.id} is not a manager`);
  }

  // return result
  return result;
} // isManager

/**
 * Sends an email using AWS SES.
 *
 * @param {String} source - The source email address
 * @param {Array} toAddresses - The array of address to send the email to
 * @param {String} subject - The subject of the email
 * @param {String} body - The body of the email
 * @param {Boolean} isHtml - Whether or not the body of the email is formatted with HTML
 * @returns Promise - The result of the email that is attempted to send
 */
async function sendEmail(source, toAddresses, subject, body, isHtml = false) {
  try {
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
    return Promise.resolve(await sesClient.send(emailCommand));
  } catch (err) {
    return Promise.reject(err);
  }
} // sendEmail

module.exports = {
  asyncForEach,
  generateUUID,
  getExpressJwt,
  invokeLambda,
  isAdmin,
  isIntern,
  isUser,
  isManager,
  sendEmail
};
