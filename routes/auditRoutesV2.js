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
