CREATE TYPE notification_reason AS ENUM(
  'expense_revisal_request',
  'expense_rejection',
  'weekly_timesheet_reminder',
  'montly_timesheet_reminder',
  'training_hour_exchange',
  'high_five'
);

CREATE TABLE IF NOT EXISTS notifications(
  id BIGSERIAL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  receiver_id UUID NOT NULL,
  sent_to TEXT NOT NULL,
  reason notification_reason NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_receiver ON notifications(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_reason ON notifications(reason);
CREATE INDEX IF NOT EXISTS idx_notifications_time ON notifications(created_at);

