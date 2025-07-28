import { SqlParameter } from '@aws-sdk/client-rds-data';
import { DynamoTable as DynamoTableType, PortalRole as PortalRoleType } from '../types';

/**
 * Model for the portal_role type
 */
export const PortalRole = {
  intern: 'intern',
  user: 'user',
  manager: 'manager',
  admin: 'admin'
} as const;

/**
 * Model for the dynamo_table type
 */
export const DynamoTable = {
  budgets: 'budgets',
  contracts: 'contracts',
  employees: 'employees',
  employees_sensitive: 'employees_sensitive',
  expense_types: 'expense_types',
  expenses: 'expenses',
  gift_cards: 'gift_cards',
  pto_cashouts: 'pto_cashouts',
  tags: 'tags',
  timesheets: 'timesheets'
} as const;

/**
 * Model for a row in the crud_audits table
 */
export class CrudAudit {
  id: number;
  createdAt: Date;
  actorId: string;
  actorRole: string;
  originTable: string;
  tableItemId: string;
  oldImage: any;
  newImage: any;

  /**
   * @param id Table id
   * @param createdAt Exact time created
   * @param actorId UUID of employee who caused the change
   * @param actorRole The role of the actor at the time of the change
   * @param originTable The table in which the item was changed
   * @param tableItemId The UUID of the item in the table
   * @param oldImage The old value of the changed object/field
   * @param newImage The new value of the changed object/field
   */
  constructor(
    id: number | undefined,
    createdAt: Date | undefined,
    actorId: string,
    actorRole: PortalRoleType,
    originTable: DynamoTableType,
    tableItemId: string,
    oldImage: any,
    newImage: any
  ) {
    this.id = id;
    this.createdAt = createdAt;
    this.actorId = actorId;
    this.actorRole = actorRole;
    this.originTable = originTable;
    this.tableItemId = tableItemId;
    this.oldImage = oldImage;
    this.newImage = newImage;
  }

  /**
   * Serializes a crud audit to be inserted into the database.
   *
   * @returns An insertable crud audit. It's cast to any to bypass type checking, but kysely-data-api can safely parse this
   */
  get asInsertable(): any {
    return {
      actorId: { value: { stringValue: this.actorId }, typeHint: 'UUID' } as SqlParameter,
      ...(this.createdAt && { createdAt: this.createdAt }), // only apply createdAt if it's defined on this instance. otherwise the database will assign a value
      actorRole: this.actorRole,
      originTable: this.originTable,
      tableItemId: { value: { stringValue: this.tableItemId }, typeHint: 'UUID' } as SqlParameter,
      oldImage:
        this.oldImage === null
          ? null
          : ({ value: { stringValue: JSON.stringify(this.oldImage) }, typeHint: 'JSON' } as SqlParameter),
      newImage:
        this.newImage === null
          ? null
          : ({ value: { stringValue: JSON.stringify(this.newImage) }, typeHint: 'JSON' } as SqlParameter)
    };
  }
}
