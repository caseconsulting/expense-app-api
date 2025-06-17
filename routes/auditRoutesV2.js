const express = require('express');
const { RDSDataClient, ExecuteStatementCommand, DatabaseResumingException } = require('@aws-sdk/client-rds-data');
const { getExpressJwt } = require(process.env.AWS ? 'utils' : '../js/utils.js');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const dotenv = require('dotenv');

/** @typedef {import('../models/audits/audits.js').AuditRequestFilters} AuditRequestFilters */
/** @typedef {import('../models/audits/notification.js').Notification} Notification */
/** @typedef {import('@aws-sdk/client-rds-data').ExecuteStatementCommandOutput} ExecuteStatementCommandOutput */

dotenv.config();
const rdsClient = new RDSDataClient({ region: 'us-east-1' });
const secretArn = process.env.AURORA_SECRET_ARN;
const clusterArn = process.env.AURORA_CLUSTER_ARN;
const dbName = process.env.AURORA_DB_NAME;
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
   * @private
   * @param {express.Request} req
   * @param {express.Response} res
   */
  async getAudits(req, res) {
    logger.log(1, 'getAudits', `Received query: ${req.query}`);

    const { startDate, endDate, reason } = req.body;

    try {
      const results = await this.readNotifications({ startDate, endDate, reason });
      logger.log(1, 'getAudits', `Successfully queried notifications: ${JSON.stringify(results)}`);
      res.status(200).json(results);
    } catch (err) {
      logger.log(1, 'getAudits', `Error querying notifications: ${err}`);
      res.status(500).json({ error: err.message || 'Database query failed.' });
    }
  }

  // HELPER FUNCTIONS

  /**
   * Sends a command to the database, and retries if the database is waking up
   * @private
   * @param {string} sql The sql command
   * @param {import('@aws-sdk/client-rds-data').SqlParameter | undefined} parameters Rds Data Api parameters
   * @returns {Promise<ExecuteStatementCommandOutput> | undefined} The output of the command if any
   */
  async sendCommand(sql, parameters) {
    let retry;
    do {
      retry = false;
      try {
        const command = new ExecuteStatementCommand({
          resourceArn: clusterArn,
          secretArn: secretArn,
          database: dbName,
          sql: sql
        });
        if (parameters) command.parameters = parameters;

        return await rdsClient.send(command);
      } catch (err) {
        // if database is resuming, retry
        if (err instanceof DatabaseResumingException) {
          logger.log(1, 'sendCommand', 'Database is resuming, trying again in 5 seconds');
          retry = true;
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else throw err; // else propagate the error
      }
    } while (retry);
  }

  /**
   * Queries the database for notifications
   * @private
   * @param {AuditRequestFilters} filters The request filters
   * @returns {Promise<Notification[]>} The notifications queried
   */
  async readNotifications(filters) {
    const { startDate, endDate, notifReason } = filters;
    let sql = `SELECT id, created_at, receiver_id, sent_to, reason
    FROM notifications`;
    let parameters = [];

    if (startDate && endDate) {
      sql += '\nWHERE created_at BETWEEN :startDate::timestamp AND :endDate::timestamp';
    } else if (startDate) {
      sql += '\nWHERE created_at >= :startDate::timestamp';
    } else if (endDate) {
      sql += '\nWHERE created_at <= :endDate::timestamp';
    }

    if (startDate) {
      parameters.push({
        name: 'startDate',
        value: { stringValue: new Date(startDate).toISOString() }
      });
    }
    if (endDate) {
      parameters.push({
        name: 'endDate',
        value: { stringValue: new Date(endDate).toISOString() }
      });
    }

    if (notifReason) {
      sql += ' AND reason = :reason::notification_reason';
      parameters.push({
        name: 'reason',
        value: { stringValue: notifReason }
      });
    }

    sql += '\nORDER BY created_at DESC LIMIT 50';

    logger.log(1, 'queryNotifications', `SQL: ${sql}`);
    logger.log(1, 'queryNotifications', `Parameters: ${parameters}`);

    const res = await this.sendCommand(sql, parameters);

    return res.records.map((row) => ({
      id: row[0]?.stringValue,
      createdAt: row[1]?.stringValue,
      receiverId: row[2]?.stringValue,
      sentTo: row[3]?.stringValue,
      reason: row[4]?.stringValue
    }));
  }

  /**
   * Inserts a notification into the database
   * @private
   * @param {import('../models/audits/notification.js').Notification} notification
   *        The notification to insert (note: id will be ignored)
   */
  async writeNotification(notification) {
    const sql = `INSERT INTO notifications (created_at, receiver_id, sent_to, reason)
    VALUES (:createdAt::timestamp, :receiverId::uuid, :sentTo, :reason::notification_reason)
    RETURNING id`;

    try {
      const res = await this.sendCommand(sql, notification.toDataApiParams());

      logger.log(1, 'writeNotification', `Inserted Notification Audit Results: ${res ?? 'N/A'}`);
    } catch (err) {
      logger.error(1, 'writeNotification', `Insertion failed: ${err}`);
      return;
    }
  }

  // GETTERS

  /**
   * Gets this instnces router
   * @public
   * @returns {express.Router} The router
   */
  get router() {
    logger.log(5, 'router', 'Getting router');
    return this._router;
  }
}

module.exports = AuditRoutesV2;
