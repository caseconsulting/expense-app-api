import { NotificationReason as NotifReasonType } from '../types';

/**
 * Model for the notification_reason type
 */
export const NotificationReason = {
  expense_revisal_request: 'expense_revisal_request',
  expense_rejection: 'expense_rejection',
  weekly_timesheet_reminder: 'weekly_timesheet_reminder',
  monthly_timesheet_reminder: 'monthly_timesheet_reminder',
  training_hour_exchange: 'training_hour_exchange',
  high_five: 'high_five'
} as const;

/**
 * Model for a row in the notifications table
 */
export class NotificationAudit {
  id: number;
  createdAt: Date;
  receiverId: string;
  sentTo: string;
  reason: string | number | typeof Symbol.iterator;

  /**
   * @param id Database id
   * @param createdAt When the notification was sent
   * @param receiverId The uuid of the employee who received the notification
   * @param sentTo Where the notification was sent (e.g. phone number, email)
   * @param reason The reason the notification was sent (i.e. the type of notification)
   */
  constructor(id: number, createdAt: Date, receiverId: string, sentTo: string, reason: NotifReasonType) {
    this.id = id;
    this.createdAt = createdAt;
    this.receiverId = receiverId;
    this.sentTo = sentTo;
    this.reason = reason;
  }
}
