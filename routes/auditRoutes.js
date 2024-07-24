const express = require('express');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const { getExpressJwt, createAudit } = require(process.env.AWS ? 'utils' : '../js/utils');

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

module.exports = { AuditRoutes };
