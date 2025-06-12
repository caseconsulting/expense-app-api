const express = require('express');
const router = express.Router();
const { RDSDataClient, ExecuteStatementCommand, DatabaseResumingException } = require('@aws-sdk/client-rds-data');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const dotenv = require('dotenv');
dotenv.config();

//const Employee = require(process.env.AWS ? 'employee' : '../models/employee');
const Notification = require('../models/audits/notification');
const rdsClient = new RDSDataClient({ region: 'us-east-1' });
const secretArn = process.env.AURORA_SECRET_ARN;
const clusterArn = process.env.AURORA_CLUSTER_ARN;
const dbName = process.env.AURORA_DB_NAME;
const logger = new Logger('auditRoutesV2');

/**
 * @typedef {import('@aws-sdk/client-rds-data').ExecuteStatementCommandOutput} ExecuteStatementCommandOutput
 */

/**
 * Sends a command to the database, and retries if the database is waking up
 * @param {string} sql The sql command
 * @param {import('@aws-sdk/client-rds-data').SqlParameter | undefined} parameters Rds Data Api parameters
 * @returns {Promise<ExecuteStatementCommandOutput> | undefined} The output of the command if any
 */
async function sendCommand(sql, parameters) {
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

// eslint-disable-next-line no-unused-vars
async function insertNotificationAudit(data) {
  const audit = new Notification(null, data.createdAt, data.receiverId, data.sentTo, data.reason);

  const sql = `INSERT INTO notifications (created_at, receiver_id, sent_to, reason)
    VALUES (:createdAt::timestamp, :receiverId::uuid, :sentTo, :reason::notification_reason)
    RETURNING id`;

  let retry;
  do {
    retry = false;
    try {
      const res = await sendCommand(sql, audit.toDataApiParams());

      logger.log(1, 'insertNotificationAudit', `Inserted Notification Audit Results: ${res ?? 'N/A'}`);
    } catch (err) {
      logger.error(1, 'insertNotificationAudit', `Insertion failed: ${err}`);
      return;
    }
  } while (retry);
}

// insertNotificationAudit({
//   createdAt: new Date(),
//   receiverId: 'afdaf4cd-3ba5-40ca-b09c-e7a178ec2848',
//   sentTo: 'mdanh@consultwithcase.com',
//   reason: 'high_five'
// });

async function queryNotifications({ startDate, endDate, reason }) {
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

  if (reason) {
    sql += ' AND reason = :reason::notification_reason';
    parameters.push({
      name: 'reason',
      value: { stringValue: reason }
    });
  }

  sql += '\nORDER BY created_at DESC LIMIT 50';

  logger.log(1, 'queryNotifications', `SQL: ${sql}`);
  logger.log(1, 'queryNotifications', `Parameters: ${parameters}`);

  const res = await sendCommand(sql, parameters);

  return res.records.map((row) => ({
    id: row[0]?.stringValue,
    createdAt: row[1]?.stringValue,
    receiverId: row[2]?.stringValue,
    sentTo: row[3]?.stringValue,
    reason: row[4]?.stringValue
  }));
}

async function getAudits(req, res) {
  logger.log(1, 'getAudits', `Received query: ${req.query}`);

  const { startDate, endDate, reason } = req.body;

  try {
    const results = await queryNotifications({ startDate, endDate, reason });
    logger.log(1, 'getAudits', `Successfully queried notifications: ${JSON.stringify(results)}`);
    res.status(200).json(results);
  } catch (err) {
    logger.log(1, 'getAudits', `Error querying notifications: ${err}`);
    res.status(500).json({ error: err.message || 'Database query failed.' });
  }
}

router.get('/', getAudits);

module.exports = router;
