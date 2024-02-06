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
   * @param req the request object
   * @param res the response object
   * @return - the error message or the new audit object
   */
  async _create(req, res) {
    let data = req.body;
    logger.log(2, '_create', `Preparing to create audit ${data.id}`);

    try {
      // If a valid request (#TODO be more thorough)
      if (data.id && data.type && data.employeeId && data.timeToLive && req.employee) {
        let now = dateUtils.getTodaysDate('YYYY-MM-DDTHH:mm:ssZ');
        // Set up new audit
        let newAudit = {
          id: data.id,
          dateCreated: now,
          type: data.type,
          employeeId: data.employeeId,
          timeToLive: Number(dateUtils.getTodaysDate('X')) + data.timeToLive * 24 * 60 * 60
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

module.exports = AuditRoutes;
