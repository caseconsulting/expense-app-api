/** @typedef {import('./audits').AuditRequestFilters} AuditRequestFilters */

const { AuroraCommand } = require(process.env.AWS ? 'auroraClient' : '../../js/aurora/auroraClient');

/**
 * Model for the notification_reason type in the audits database
 * @readonly
 * @enum {string}
 */
const NotificationReason = {
  EXPENSE_REVISAL_REQUEST: 'expense_revisal_request',
  EXPENSE_REJECTION: 'expense_rejection',
  WEEKLY_TIME_REMINDER: 'weekly_timesheet_reminder',
  MONTHLY_TIME_REMINDER: 'monthly_timesheet_reminder',
  TRAINING_HOUR_EXCHANGE: 'training_hour_exchange',
  HIGH_FIVE: 'high_five'
};

/**
 * Represents a row in the notifications table. Has functionality for parsing/converting data between rds format and
 * more usable formats. Doesn't handle client/server communication
 */
class NotificationAudit {
  /**
   * @param {number} id Database id
   * @param {Date} createdAt When the notification was sent
   * @param {string} receiverId The uuid of the employee who received the notification
   * @param {string} sentTo Where the notification was sent (e.g. phone number, email)
   * @param {NotificationReason} reason The reason the notification was sent (i.e. the type of notification)
   * @private
   */
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

  // *✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫*
  // ❃                                                  ❃
  // ❇                       READ                       ❇
  // ❉                                                  ❉
  // *✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫*

  /**
   * Creates a list of notification audits from a data api response
   *
   * @param {import('@aws-sdk/client-rds-data').ExecuteStatementCommandOutput} response The data api response
   * @returns {NotificationAudit[]} The list of notifications
   *
   * @static
   */
  static fromResponse(response) {
    return response.records.map(
      (row) =>
        new NotificationAudit(
          row[0]?.stringValue,
          row[1]?.stringValue,
          row[2]?.stringValue,
          row[3]?.stringValue,
          row[4]?.stringValue
        )
    );
  }

  /**
   * Builds an sql string based on the provided filters
   *
   * @param {AuditRequestFilters} filters The query filters
   * @returns {AuroraCommand} The command state
   *
   * @static
   */
  static buildQuery(filters) {
    const { limit, startDate, endDate, notifReason } = filters;

    let sql = `SELECT id, created_at, receiver_id, sent_to, reason
    FROM notifications`;
    let params = [];

    if (startDate && endDate) {
      sql += '\nWHERE created_at BETWEEN :startDate::timestamp AND :endDate::timestamp';
    } else if (startDate) {
      sql += '\nWHERE created_at >= :startDate::timestamp';
    } else if (endDate) {
      sql += '\nWHERE created_at <= :endDate::timestamp';
    }

    if (startDate) {
      params.push({
        name: 'startDate',
        value: { stringValue: new Date(startDate).toISOString() }
      });
    }
    if (endDate) {
      params.push({
        name: 'endDate',
        value: { stringValue: new Date(endDate).toISOString() }
      });
    }

    if (notifReason) {
      sql += ' AND reason = :reason::notification_reason';
      params.push({
        name: 'reason',
        value: { stringValue: notifReason }
      });
    }

    // could make these configurable filters in the future
    sql += '\nORDER BY created_at DESC';

    if (limit) sql += `\nLIMIT ${limit}`;

    return new AuroraCommand({ sql, params });
  }

  // *✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫*
  // ❃                                                  ❃
  // ❇                      CREATE                      ❇
  // ❉                                                  ❉
  // *✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫*

  /**
   * Creates a new notification to be added to the database
   *
   * @param {Date} createdAt
   * @param {string} receiverId
   * @param {string} sentTo
   * @param {NotificationReason} reason
   * @returns {NotificationAudit}
   *
   * @static @constructor
   */
  static toCreate(createdAt, receiverId, sentTo, reason) {
    return new NotificationAudit(undefined, createdAt, receiverId, sentTo, reason);
  }

  /**
   * Builds the sql command to insert a new notification into the database
   *
   * @returns {AuroraCommand} The command state
   */
  buildCreateCommand() {
    const sql = `INSERT INTO notifications (created_at, receiver_id, sent_to, reason)
    VALUES (:createdAt::timestamp, :receiverId::uuid, :sentTo, :reason::notification_reason)
    RETURNING id`;

    const params = this.toParams();
    return new AuroraCommand({ sql, params });
  }

  /**
   * Creates data api params to pass into a request
   *
   * @returns {import('@aws-sdk/client-rds-data').SqlParameter[]} The data api parameters
   */
  toParams() {
    return [
      { name: 'createdAt', value: { stringValue: this.createdAt } },
      { name: 'receiverId', value: { stringValue: this.receiverId } },
      { name: 'sentTo', value: { stringValue: this.sentTo } },
      { name: 'reason', value: { stringValue: this.reason } }
    ];
  }
}

module.exports = {
  NotificationAudit,
  NotificationReason
};
