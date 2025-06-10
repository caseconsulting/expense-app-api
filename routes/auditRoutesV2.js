const express = require('express');
const router = express.Router();
const { RDSDataClient, ExecuteStatementCommand, DatabaseResumingException } = require('@aws-sdk/client-rds-data');
const dotenv = require('dotenv');
dotenv.config();

//const Employee = require(process.env.AWS ? 'employee' : '../models/employee');
const Notification = require('../models/audits/notification');
const rdsClient = new RDSDataClient({ region: 'us-east-1' });
const secretArn = process.env.AURORA_SECRET_ARN;
const clusterArn = process.env.AURORA_CLUSTER_ARN;
const dbName = process.env.AURORA_DB_NAME;

async function insertNotificationAudit(data) {
  const audit = new Notification(null, data.createdAt, data.receiverId, data.sentTo, data.reason);

  const inputs = {
    resourceArn: clusterArn,
    secretArn: secretArn,
    sql: `INSERT INTO notifications (created_at, receiver_id, sent_to, reason)
    VALUES (:createdAt::timestamp, :receiverId::uuid, :sentTo, :reason::notification_reason)
    RETURNING id`,
    database: dbName,
    parameters: audit.toDataApiParams()
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

insertNotificationAudit({
  createdAt: new Date(),
  receiverId: 'afdaf4cd-3ba5-40ca-b09c-e7a178ec2848',
  sentTo: 'mdanh@consultwithcase.com',
  reason: 'weekly_timesheet_reminder'
});

async function queryNotifications({ startDate, endDate, reason }) {
  let sql = `SELECT id, created_at, receiver_id, sent_to, reason
    FROM notifications
    WHERE created_at BETWEEN :startDate::timestamp AND :endDate::timestamp`;

  const parameters = [
    {
      name: 'startDate',
      value: { stringValue: new Date(startDate).toISOString()}
    },
    {
      name: 'endDate',
      value: { stringValue: new Date(endDate).toISOString()}
    },
  ];

  if (reason) {
    sql += ' AND reason = :reason';
    parameters.push({
      name: 'reason',
      value: { stringValue: reason },
    });
  }

  sql += ' ORDER BY created_at DESC';

  console.log('SQL:', sql);
  console.log('Parameters:', parameters);

  const command = new ExecuteStatementCommand({
    resourceArn: clusterArn,
    secretArn: secretArn,
    sql,
    database: dbName,
    parameters,
  });

  const result = await rdsClient.send(command);

  return result.records.map(row => ({
    id: row[0]?.stringValue,
    createdAt: row[1]?.stringValue,
    receiverId: row[2]?.stringValue,
    sentTo: row[3]?.stringValue,
    reason: row[4]?.stringValue,
  }));
}

router.get('/', async (req, res) => {
  console.log('Received query:', req.query);
  
  const { startDate, endDate, reason } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'startDate and endDate are required in YYYY-MM-DD format.',
    });
  }

  try {
    const results = await queryNotifications({ startDate, endDate, reason });
    console.log('Successfully queried notification.');
    res.status(200).json(results);
  } catch (err) {
    console.error('Error querying notifications:', err);
    res.status(500).json({ error: err.message || 'Database query failed.' });
  }
});


module.exports = router;