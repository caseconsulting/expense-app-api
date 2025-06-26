-- this file is mostly for reference, and isn't used directly since the rds data api doesn't support multiple statements in a single request

CREATE TYPE notification_reason AS ENUM(
  'expense_revisal_request',
  'expense_rejection',
  'weekly_timesheet_reminder',
  'monthly_timesheet_reminder',
  'training_hour_exchange',
  'high_five'
);

CREATE TABLE IF NOT EXISTS notifications(
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  receiver_id UUID NOT NULL,
  sent_to TEXT NOT NULL,
  reason notification_reason NOT NULL
);

CREATE INDEX IF NOT EXISTS index_notifications_receiver ON notifications(receiver_id);
CREATE INDEX IF NOT EXISTS index_notifications_reason ON notifications(reason);
CREATE INDEX IF NOT EXISTS index_notifications_created ON notifications(created_at);
