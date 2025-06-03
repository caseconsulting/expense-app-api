const postgres = require('postgres');

const pgOptions = {
  host: 'dev-expense-app-db.cnmcdofh34x6.us-east-1.rds.amazonaws.com',
  port: 3306,
  database: 'dev_expense_app_db',
  username: 'consultwithcase',
  password: 'consultwithcase'
};

async function main() {
  const sql = postgres(`postgres://${pgOptions.host}:${pgOptions.port}`, pgOptions);

  await sql`
  -- reasons a notification is sent
  -- add types with ALTER TYPE notification_reason ADD VALUE 'new_value'
  -- types cannot be removed
  CREATE TYPE IF NOT EXISTS notification_reason AS ENUM(
    'expense_revisal_request',
    'expense_rejection',
    'weekly_timesheet_reminder',
    'montly_timesheet_reminder',
    'training_hour_exchange',
    'high_five',
  );

  -- create notifications (text/email) database
  CREATE TABLE IF NOT EXISTS notifications(
    id GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    receiver_id UUID NOT NULL,           -- if we migrate employees to aurora: REFERENCES employees(id)
    sent_to TEXT NOT NULL,               -- email, phone number, etc
    reason notification_reason NOT NULL, -- reason the portal sent the notification
  );

  -- create indexes for r wceiver, reason, and time
  CREATE INDEX IF NOT EXISTS idx_notifications_receiver ON notifications(receiver_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_reason ON notifications(reason);
  CREATE INDEX IF NOT EXISTS idx_notifications_time ON notifications(created_at);
  `;

  // close the connection
  sql.end();
}

main();
