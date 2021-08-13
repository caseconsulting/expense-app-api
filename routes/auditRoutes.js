const Audit = require('./../models/audit');
const DatabaseModify = require('../js/databaseModify');
const Logger = require('../js/Logger');
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;

const moment = require('moment-timezone');
moment.tz.setDefault('America/New_York');
const logger = new Logger('auditRoutes');

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = jwt({
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

class AuditRoutes {
  
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getuserInfo = getUserInfo;

    this._router.post(
      '/',
      this._checkJwt,
      this._getuserInfo,
      this._create.bind(this)
    );

    this._router.get(
      '/:type/:days',
      this._checkJwt,
      this._getuserInfo,
      this._readByType.bind(this)
    );

    this.databaseModify = new DatabaseModify('audits');
  } //constructor

  /**
   * Prepares an audit to be created.
   * 
   * The req body must have the following fields:
   *  - id
   *  - type
   *  - employeeId
   *  - timeToLive (in days)
   * And optionally:
   *  - description
   * 
   * @param {*} req the request object
   * @param {*} res the response object
   * @returns the error message or the new audit object
   */
  async _create(req, res) {
    let data = req.body;
    logger.log(2, '_create', `Preparing to create audit ${data.id}`);

    try {
      // If a valid request (#TODO be more thorough)
      if (data.id && data.type && data.employeeId && data.timeToLive && req.employee) {
        let now = moment();
        // Set up new audit
        let newAudit = {
          id: data.id,
          dateCreated: now.format(),
          type: data.type,
          employeeId: data.employeeId,
          timeToLive: Number(moment().format('X')) + data.timeToLive * 24 * 60 * 60
        };

        if (data.description) {
          newAudit['description'] = data.description;
        }

        if (data.tags) {
          newAudit['tags'] = data.tags;
        }

        let audit = new Audit(newAudit);
        logger.log(2, '_create', `Successfully created audit ${data.id}`);
  
        this.databaseModify.addToDB(audit);
        res.status(200).send(audit);
      } else {
        throw {
          code: 400,
          message: 'Bad request' 
        };
      }
    } catch (err) {
      logger.log(2, '_create', `Failed to create audit ${data.id}`);
      
      return res.status(err.code).send({ code: err.code, message: err.message });
    }
  } // _create

  /**
   * Gets all audits of req.params.type type from the past req.params.days days
   * 
   * @param {*} req the request object
   * @param {*} res the response object
   * @returns the query or an error
   */
  async _readByType(req, res) {
    logger.log(2, '_readByType', `Attempting to read \
     the past ${req.params.days} days of audit of type ${req.params.type}`); 

    // Audits after this date will be returned
    let cutOffDate = moment().subtract(Number(req.params.days), 'd').format();

    let expressionAttributes = {
      ':typeName' : req.params.type,
      ':cutOffDate': cutOffDate 
    };

    let additionalParams = {
      ExpressionAttributeValues: expressionAttributes,
      ExpressionAttributeNames: { '#type' : 'type'},
      KeyConditionExpression: '#type = :typeName and dateCreated >= :cutOffDate'
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
}

module.exports = AuditRoutes;
