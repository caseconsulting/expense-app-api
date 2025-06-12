const express = require('express');
const { RDSDataClient, ExecuteStatementCommand, DatabaseResumingException } = require('@aws-sdk/client-rds-data');
const { getExpressJwt } = require(process.env.AWS ? 'utils' : '../js/utils.js');
const dotenv = require('dotenv');
const { AuditRequestFilters } = require('../models/audits/audits.js');

/** @typedef {import('../models/audits/notification.js').Notification} Notification */

dotenv.config();
const rdsClient = new RDSDataClient({ region: 'us-east-1' });
const secretArn = process.env.AURORA_SECRET_ARN;
const clusterArn = process.env.AURORA_CLUSTER_ARN;
const dbName = process.env.AURORA_DB_NAME;

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
    const filters = new AuditRequestFilters(req.body);
    const { startDate, endDate, notifReason } = filters;

    try {
      const results = await this.readNotifications({ startDate, endDate, notifReason });
      console.log('getAudits - Success:', results);
      res.status(200).json(results);
    } catch (err) {
      console.log('getAudits - Error:', err);
      res.status(500).json({ error: err.message || 'Database query failed.' });
    }
  }

  // HELPER FUNCTIONS

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

    console.log('SQL:', sql);
    console.log('Parameters:', parameters);

    const command = new ExecuteStatementCommand({
      resourceArn: clusterArn,
      secretArn: secretArn,
      sql,
      database: dbName,
      parameters
    });

    const result = await rdsClient.send(command);

    return result.records.map((row) => ({
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
    /** @type import('@aws-sdk/client-rds-data').ExecuteStatementCommandInput */
    const inputs = {
      resourceArn: clusterArn,
      secretArn: secretArn,
      sql: `INSERT INTO notifications (created_at, receiver_id, sent_to, reason)
    VALUES (:createdAt::timestamp, :receiverId::uuid, :sentTo, :reason::notification_reason)
    RETURNING id`,
      database: dbName,
      parameters: notification.toDataApiParams()
    };

    let retry;
    do {
      retry = false;
      try {
        const command = new ExecuteStatementCommand(inputs);
        const res = await rdsClient.send(command);

        console.log('Inserted Notification Audit Results:', res ?? 'N/A');
      } catch (err) {
        if (err instanceof DatabaseResumingException) {
          console.log('Database is resuming, trying again in 5 seconds');
          retry = true;
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          console.error('Insertion failed', err);
          return;
        }
      }
    } while (retry);
  }

  // GETTERS

  /**
   * Gets this instnces router
   * @public
   * @returns {express.Router} The router
   */
  get router() {
    // TODO: logger.log(5, 'router', 'Getting router');
    return this._router;
  }
}

module.exports = AuditRoutesV2;
