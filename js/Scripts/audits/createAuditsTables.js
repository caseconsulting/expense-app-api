require('dotenv').config(); // load env variables used by AuroraClient
const { AuroraClient, AuroraCommand } = require('../../aurora/auroraClient');

const client = new AuroraClient();

const commands = [
  // create notification type enum
  new AuroraCommand({
    sql: `CREATE TYPE notification_reason AS ENUM(
      'expense_revisal_request',
      'expense_rejection',
      'weekly_timesheet_reminder',
      'monthly_timesheet_reminder',
      'training_hour_exchange',
      'high_five'
    );`
  }),

  // create the table
  new AuroraCommand({
    sql: `CREATE TABLE IF NOT EXISTS notifications(
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      receiver_id UUID NOT NULL,
      sent_to TEXT NOT NULL,
      reason notification_reason NOT NULL
    );`
  }),

  // index by uuid of employee who received it
  new AuroraCommand({
    sql: 'CREATE INDEX IF NOT EXISTS index_notifications_receiver ON notifications(receiver_id);'
  }),

  // index by notification type
  new AuroraCommand({
    sql: 'CREATE INDEX IF NOT EXISTS index_notifications_reason ON notifications(reason);'
  }),

  // index by date created/sent
  new AuroraCommand({
    sql: 'CREATE INDEX IF NOT EXISTS index_notifications_created ON notifications(created_at);'
  })
];

async function main() {
  let transaction;
  try {
    transaction = await client.beginTransaction();
  } catch (err) {
    console.log(`Transaction could not be created. Error: ${err}`);
    return;
  }

  for (let command of commands) {
    try {
      command.transaction = transaction;
      await client.send(command);
    } catch (err) {
      await client.rollbackTransaction(transaction);
      console.log(`Rolling back due to error: ${err?.message ?? err}`);
      return;
    }
  }

  await client.commitTransaction(transaction);
}

main();
