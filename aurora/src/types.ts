import { PortalRole, DynamoTable, NotificationReason } from './models';

/**
 * A row in the crud_audit table
 */
export interface CrudAudit {
  id: number;
  createdAt: Date;
  actorId: string;
  actorRole: keyof typeof PortalRole;
  originTable: keyof typeof DynamoTable;
  tableItemId: string;
  oldImage: any;
  newImage: any;
}

/**
 * A row in the notifications table
 */
export interface NotificationAudit {
  id: number;
  createdAt: Date;
  receiverId: string;
  sentTo: string;
  reason: keyof typeof NotificationReason;
}

/**
 * Common filters for select queries on all audit types
 */
export interface AuditQueryFilters {
  limit: number;
  startDate: Date;
  endDate: Date;
}

export interface CrudAuditQueryFilters extends AuditQueryFilters {
  actor: string;
  table: keyof typeof DynamoTable;
  tableItem: string;
}

export interface NotifAuditQueryFilters extends AuditQueryFilters {
  receiver: string;
}

/**
 * Database type for Kysely. Specifies all the tables we use and associates them with a type.
 */
export interface Database {
  notifications: NotificationAudit;
  crud_audits: CrudAudit;
}
