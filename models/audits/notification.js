/**
 * Model for the notification_reason type in the audits database
 */
 
const NotificationReason = Object.freeze({
  EXPENSE_REVISAL_REQUEST: 'expense_revisal_request',
  EXPENSE_REJECTION: 'expense_rejection',
  WEEKLY_TIME_REMINDER: 'weekly_timesheet_reminder',
  MONTHLY_TIME_REMINDER: 'montly_timesheet_reminder',
  TRAINING_HOUR_EXCHANGE: 'training_hour_exchange',
  HIGH_FIVE: 'high_five'
});

/**
 * Model for a notification in the audits database
 */
 
class Notification {
  constructor(id, createdAt, receiverId, sentTo, reason) {
    /**
     * The database id for this notification
     * @type {number}
     */
    this.id = id;

    /**
     * The time this notification was sent
     * @type {Date}
     */
    this.createdAt = createdAt;

    /**
     * The UUID of the employee who received the notification
     * @type {string}
     */
    this.receiverId = receiverId;

    /**
     * The email or phone number to which this was sent
     * @type {string}
     */
    this.sentTo = sentTo;

    /**
     * The reason/purpose of the notification
     * @type {NotificationReason}
     */
    this.reason = reason;
  }
}
