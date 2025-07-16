/**
 * Model for the portal_role type
 */
export const PortalRole = {
  intern: 'intern',
  user: 'user',
  manager: 'manager',
  admin: 'admin'
} as const;
export type PortalRole = keyof typeof PortalRole;

/**
 * Model for the dynamo_table type
 * @readonly @enum {string}
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
};
export type DynamoTable = keyof typeof DynamoTable;

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
    id: number,
    createdAt: Date,
    actorId: string,
    actorRole: keyof typeof PortalRole,
    originTable: keyof typeof DynamoTable,
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
}
