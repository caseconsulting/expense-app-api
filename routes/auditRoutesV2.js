/** @typedef {import('../models/audits/audits.js').AuditRequestFilters} AuditRequestFilters */
/** @typedef {import('../models/audits/notification.js').NotificationAudit} NotificationAudit */
/** @typedef {import('@aws-sdk/client-rds-data').ExecuteStatementCommandOutput} ExecuteStatementCommandOutput */
/** @typedef {import('@aws-sdk/client-rds-data').SqlParameter} SqlParameter */

const express = require('express');
const { getExpressJwt } = require(process.env.AWS ? 'utils' : '../js/utils.js');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const { AuroraClient } = require('../js/aurora/auroraClient.js');
const { NotificationAudit } = require('../models/audits/notification.js');

const client = new AuroraClient();
const logger = new Logger('auditRoutesV2');

class AuditRoutesV2 {
  constructor() {
    /** @private */
    this.jwtMiddleware = getExpressJwt();

    /** @private @type express.Router */
    this._router = express.Router();
    this._router.get('/', this.jwtMiddleware, this.getAudits.bind(this));
  }

  // MIDDLEWARE

  /**
   * Gets a list of audits based on the request filters
   *
   * @param {express.Request} req The request body should be a json representation of an AuditRequestFilters object
   * @param {express.Response} res
   *
   * @private
   */
  async getAudits(req, res) {
    logger.log(5, 'getAudits', `Received query: ${req.query}`);

    const { limit, startDate, endDate, reason } = req.body;

    try {
      const results = await this.readNotifications({ limit, startDate, endDate, reason });
      logger.log(5, 'getAudits', `Successfully queried notifications: ${JSON.stringify(results)}`);
      res.status(200).json(results);
    } catch (err) {
      logger.log(5, 'getAudits', `Error querying notifications: ${err}`);
      res.status(500).json({ error: err.message ?? 'Database query failed.' });
    }
  }

  // HELPER FUNCTIONS

  /**
   * Queries the database for notifications
   *
   * @param {AuditRequestFilters} filters The request filters
   * @returns {Promise<NotificationAudit[]>} The notifications queried
   * @throws Errors that occur when sending the request
   *
   * @private
   */
  async readNotifications(filters) {
    const command = NotificationAudit.buildQuery(filters);

    try {
      const response = await client.sendCommand(command);

      if (!response.records) throw new Error('Could not parse database response');
      logger.log(5, 'readNotifications', `The database responded with ${response.records.length} records`);

      return NotificationAudit.fromResponse(response);
    } catch (err) {
      logger.log(5, 'readNotifications', err?.message ?? err);
    }
  }

  /**
   * Inserts a notification into the database
   *
   * @param {NotificationAudit} notification The notification to insert (note: id will be ignored)
   *
   * @private
   */
  async writeNotification(notification) {
    try {
      const res = await client.sendCommand(notification.buildCreateCommand());

      logger.log(5, 'writeNotification', `Inserted Notification Audit Results: ${res ?? 'N/A'}`);
    } catch (err) {
      logger.log(5, 'writeNotification', `Insertion failed: ${err}`);
      return;
    }
  }

  // GETTERS

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
