import { Generated, GeneratedAlways } from 'kysely';

import {
  DynamoTable as DynamoTableModel,
  NotificationReason as NotifReasonModel,
  PortalRole as PortalRoleModel
} from './models';

/**
 * Database type for Kysely. Specifies all the tables we use and associates them with a type.
 */
export interface Database {
  notifications: NotificationAudit;
  crudAudits: CrudAudit;
}

/**
 * A row in the crud_audit table
 */
export interface CrudAudit {
  id: GeneratedAlways<number>;
  createdAt: Generated<Date>;
  actorId: string;
  actorRole: PortalRole;
  originTable: DynamoTable;
  tableItemId: string;
  oldImage: any;
  newImage: any;
}

/**
 * A type with the minimum information to create a new crud audit (for insert queries)
 */
export type CrudAuditLike = {
  employee: { id: string; employeeRole: string };
  table: DynamoTable;
  oldImage: { id: string };
  newImage: { id: string };
};

export type PortalRole = (typeof PortalRoleModel)[keyof typeof PortalRoleModel]; // i.e. the values of PortalRoleModel
export type DynamoTable = (typeof DynamoTableModel)[keyof typeof DynamoTableModel];

/**
 * A row in the notifications table
 */
export interface NotificationAudit {
  id: number;
  createdAt: Generated<Date>;
  receiverId: string;
  sentTo: string;
  reason: NotificationReason;
}

export type NotificationReason = (typeof NotifReasonModel)[keyof typeof NotifReasonModel];

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
  table: DynamoTable;
  tableItem: string;
}

export interface NotifAuditQueryFilters extends AuditQueryFilters {
  receiver: string;
}
