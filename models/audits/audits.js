export class AuditRequestFilters {
  constructor(properties) {
    if (!properties) return;

    /**
     * The types of audits to include in the filter
     * @type AuditType[]
     */
    this.types = properties?.types;

    /**
     * The uuid of the employee who caused the audit
     * @type {string}
     */
    this.actor = properties?.actor;

    /**
     * The uuid of the employee whose data was changed, or (if the audit is a notification) received the notification
     * @type {string}
     */
    this.receiver = properties?.receiver;

    /** @type Date */
    this.startDate = properties?.startDate;
    /** @type Date */
    this.endDate = properties?.endDate;

    /** @type import('./notification').NotificationReason */
    this.notifReason = properties?.notifReason;
  }
}
