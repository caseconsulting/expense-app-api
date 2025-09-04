const express = require('express');
const { getExpressJwt } = require(process.env.AWS ? 'utils' : '../js/utils.js');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const { CrudAuditQueries, NotifAuditQueries } = require('expense-app-db/queries');

const logger = new Logger('auditRoutesV2');

class AuditRoutesV2 {
  constructor() {
    /** @private */
    this.jwtMiddleware = getExpressJwt();

    /** @private @type express.Router */
    this._router = express.Router();
    this._router.get('/notification', this.jwtMiddleware, this.getNotifAudits.bind(this));
    this._router.get('/crud', this.jwtMiddleware, this.getCrudAudits.bind(this));
  }

  // *✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫*
  // ❃                                                  ❃
  // ❇                    MIDDLEWARE                    ❇
  // ❉                                                  ❉
  // *✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫*

  /**
   * Gets a list of audits based on the request filters
   *
   * @param {express.Request} req The request body should be a json representation of an AuditRequestFilters object
   * @param {express.Response} res
   *
   * @private
   */
  async getNotifAudits(req, res) {
    logger.log(5, 'getNotifAudits', `Received query: ${req.query}`);

    try {
      const results = await NotifAuditQueries.select(req.body);

      logger.log(5, 'getNotifAudits', `The database responded with ${results.length} records`);
      res.status(200).json(results);
    } catch (err) {
      logger.log(5, 'getNotifAudits', `Error querying notification audits: ${JSON.stringify(err)}`);
      res.status(500).json({ error: 'Could not fetch records' });
    }
  }

  /**
   * Gets a list of crud audits based on the request filters
   *
   * @param {express.Request} req The request body should be a json representation of an AuditRequestFilters object
   * @param {express.Response} res
   *
   * @private
   */
  async getCrudAudits(req, res) {
    logger.log(5, 'getCrudAudits', `Received query: ${req.query}`);

    try {
      const results = await CrudAuditQueries.select(req.query);

      logger.log(5, 'getCrudAudits', `The database responded with ${results.length} records`);
      res.status(200).json(results);
    } catch (err) {
      logger.log(5, 'getCrudAudits', `Error querying crud audits: ${err.message ?? err}`);
      res.status(500).json({ error: 'Could not fetch records' });
    }
  }

  // *✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫*
  // ❃                                                  ❃
  // ❇                     GETTERS                      ❇
  // ❉                                                  ❉
  // *✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫*

  /**
   * Gets this instances router
   *
   * @returns {express.Router} The router
   */
  get router() {
    logger.log(5, 'router', 'Getting router');
    return this._router;
  }
}

module.exports = AuditRoutesV2;
