const express = require('express');
const Audit = require(process.env.AWS ? 'audit' : '../models/audit');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const dateUtils = require(process.env.AWS ? 'dateUtils' : '../js/dateUtils');
const { getExpressJwt } = require(process.env.AWS ? 'utils' : '../js/utils');

const logger = new Logger('auditRoutes');

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = getExpressJwt();

// audit types. putting something in requiredFields will require it to be passed in to the createAudit function.
// fields that are required in audit.js and not supplied to createAudit must be added by the function.
let AUDIT_TYPES = {
  // REGULAR audits track basic database CRUD operations
  REGULAR: {
    requiredFields: ['id', 'employeeId', 'tableName', 'tableRow', 'action', 'timeToLive']
  },

  // RESUME audits track resume uploads and deletions
  RESUME: {
    requiredFields: ['id', 'employeeId', 'action',  'timeToLive']
  },

  // LOGIN audits track logins and user data, including:
  // browser, width and height of display, session logout
  // vs timout. note that all audits have a time attached automatically
  LOGIN: {
    requiredFields: ['id', 'employeeId', 'action', 'supplemental', 'timeToLive']
  },

  // ERROR audits catch errors so that we can see if there are a lot of repeated errors
  // which may indicate a bug. include environment (front/back end, dev/test/prod), browser info
  // if applicable, and any other data that could potentially be useful
  ERROR: {
    requiredFields: ['id', 'employeeId', 'supplemental', 'timeToLive']
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

/**
 * Helper function:
 * Prepares an audit to be created. Audit must include information required by their
 * audit type, described in the variable AUDIT_TYPES above.
 *
 * @param data the audit data
 * @return - the new audit object
 */
async function createAudit(data) {
  logger.log(2, 'createAudit', `Preparing to create audit ${data.id}`);

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

  let now = dateUtils.getTodaysDate('YYYY-MM-DDTHH:mm:ssZ');
  let unixTimestamp = Number(dateUtils.getTodaysDate('X'));

  // set up new audit
  let newAudit = {};
  newAudit.type = data.type;
  newAudit.timeToLive = unixTimestamp + newAudit.timeToLive * 24 * 60 * 60;
  newAudit.datetime = now;
  newAudit.action = ACTIONS.NA; // default, can be overridden
  // auto-fill whatever fields were provided
  // note that running `new Audit()` will remove any superfluous fields
  for (let field of data) newAudit[field] = data[field];

  // attempt to officially create audit
  let audit;
  try {
    audit = new Audit(newAudit);
  } catch (err) {
    throw new TypeError('Failed to create audit object');
  }

  logger.log(2, 'createAudit', `Successfully created audit ${data.id}`);

  // TODO: upload to db this.databaseModify.addToDB(audit);

  return audit;
} // createAudit

class AuditRoutes {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getuserInfo = getUserInfo;

    this._router.post('/', this._checkJwt, this._getuserInfo, this._create.bind(this));

    this._router.get('/:type/:startDate/:endDate', this._checkJwt, this._getuserInfo, this._readByType.bind(this));

    this.databaseModify = new DatabaseModify('audits');
  } //constructor

  /**
   * Prepares an audit to be created. Audit must include information required by their
   * audit type, described in the variable AUDIT_TYPES above.
   *
   * @param req the request object
   * @param res the response object
   * @return - the new audit object, or error message
   */
  async _create(req, res) {
    try {
      let data = req.body;
      let audit = await createAudit(data);
      res.status(200).send(audit);
    } catch (e) {
      res.status(400).send(e.message);
    }
  } // _create

  /**
   * Gets all audits of req.params.type type from the past req.params.days days
   *
   * @param req the request object
   * @param res the response object
   * @return - the query or an error
   */
  async _readByType(req, res) {
    logger.log(
      2,
      '_readByType',
      `Attempting to read \
     the from ${req.params.startDate} to ${req.params.endDate} of audit of type ${req.params.type}`
    );

    let expressionAttributes = {
      ':typeName': req.params.type,
      ':startDate': req.params.startDate,
      ':endDate': req.params.endDate
    };

    let additionalParams = {
      ExpressionAttributeValues: expressionAttributes,
      ExpressionAttributeNames: { '#type': 'type' },
      KeyConditionExpression: '#type = :typeName AND dateCreated BETWEEN :startDate AND :endDate'
    };

    try {
      let ret = await this.databaseModify.querySecondaryIndexInDB(
        'type-dateCreated-index',
        'type',
        req.params.type,
        additionalParams
      );
      res.status(200).send(ret);
      return ret;
    } catch (err) {
      res.status(err.code).send(err);
      return err;
    }
  } // _readByType

  /**
   * Returns the instace express router.
   *
   * @return Router Object - express router
   */
  get router() {
    // log method
    logger.log(5, 'router', 'Getting router');

    return this._router;
  } // router
} // AuditRoutes

module.exports = {AuditRoutes, createAudit};

