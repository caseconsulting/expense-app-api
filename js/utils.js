const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const logger = new Logger('tSheetsRoutes');
const lambdaClient = new LambdaClient();
const Audit = require(process.env.AWS ? 'audit' : '../models/audit');
const dateUtils = require(process.env.AWS ? 'dateUtils' : '../js/dateUtils');

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
 * Helper function:
 * Prepares an audit to be created. Audit must include information required by their
 * audit type, described in the variable AUDIT_TYPES above.
 *
 * @param data the audit data
 * @return - the new audit object
 */
async function createAudit(data) {
  let auditId = data.id ?? generateUUID();
  logger.log(2, 'createAudit', `Preparing to create audit ${auditId}`);

  // audit types. putting something in requiredFields will require it to be passed in to the createAudit function.
  // fields that are required in audit.js and not supplied to createAudit must be added by the function.
  let AUDIT_TYPES = {
  // REGULAR audits track basic database CRUD operations
    REGULAR: {
      requiredFields: ['employeeId', 'tableName', 'tableRow', 'action']
    },

    // RESUME audits track resume uploads and deletions
    RESUME: {
      requiredFields: ['employeeId', 'action',]
    },

    // LOGIN audits track logins and user data, including:
    // browser, width and height of display, session logout
    // vs timout. note that all audits have a time attached automatically
    LOGIN: {
      requiredFields: ['employeeId', 'action', 'supplemental']
    },

    // ERROR audits catch errors so that we can see if there are a lot of repeated errors
    // which may indicate a bug. include environment (front/back end, dev/test/prod), browser info
    // if applicable, and any other data that could potentially be useful
    ERROR: {
      requiredFields: ['employeeId', 'supplemental']
    }
  };

  // Types of actions
  const ACTIONS = {
  // database/file actions
    CREATE: 'CREATE',
    READ: 'READ', 
    UPDATE: 'UPDATE', 
    DELETE: 'DELETE',
    // login/logout actions
    LOGIN: 'LOGIN', 
    LOGOUT: 'LOGOUT', 
    // if there is no action (eg ERROR audit type)
    NA: 'NA'
  };

  // some default audit values that can be overridden
  const AUDIT_DEFAULT = {
    datetime: dateUtils.getTodaysDate('YYYY-MM-DDTHH:mm:ssZ'),
    action: ACTIONS.NA,
    id: auditId,
    timeToLive: 60
  };

  // ensure that data was passed in
  if (!data) {
    throw new Error('Invalid audit data');
  }
  // reject requests with invalid or missing type
  let auditTypeKeys = Object.keys(AUDIT_TYPES);
  if (!data.type || !auditTypeKeys.includes(data.type)) {
    throw new TypeError(`Must include 'type' from: '${auditTypeKeys.join("', '")}'`);
  }
  // reject requests that do not have sufficient data for their type
  let missingData = [];
  for (let field of AUDIT_TYPES[data.type].requiredFields)
    if (!data[field]) missingData.push(field);
  if (missingData.length > 0) {
    throw new TypeError(`Missing ${missingData.join(', ')}`);
  }

  let unixTimestamp = Number(dateUtils.getTodaysDate('X'));

  // set up new audit
  let newAudit = {};
  newAudit = AUDIT_DEFAULT;
  // fill in whatever fields were provided
  // note that `new Audit()` will remove any superfluous fields
  for (let field of Object.keys(data)) newAudit[field] = data[field];
  // convert TTL from days to time in the future
  newAudit.timeToLive = unixTimestamp + newAudit.timeToLive * 24 * 60 * 60;

  // attempt to officially create audit
  let audit;
  try {
    audit = new Audit(newAudit);
  } catch (err) {
    throw new TypeError('Failed to create audit object');
  }

  // TODO: upload to db this.databaseModify.addToDB(audit);

  logger.log(2, 'createAudit', `Successfully created audit ${audit.id}`);

  logger.log(2, 'createAudit', '        ---------------------------------------------------------------');
  logger.log(2, 'createAudit', JSON.stringify(audit));
  logger.log(2, 'createAudit', '        ---------------------------------------------------------------');

  return audit;
} // createAudit

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
  createAudit,
  generateUUID,
  getExpressJwt,
  invokeLambda,
  isAdmin,
  isIntern,
  isUser,
  isManager,
  sendEmail
};
