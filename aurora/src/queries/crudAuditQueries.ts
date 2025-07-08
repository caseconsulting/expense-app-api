import { db } from '../index';
import { CrudAudit, CrudAuditQueryFilters } from '../types';
import { execute, selectAudits } from './utils';

/**
 * Inserts a record into the crud_audits table
 *
 * @param audit The audit to insert
 * @returns The id of the new audit
 */
export async function insert(audit: CrudAudit): Promise<number> {
  const query = db.insertInto('crud_audits').values(audit).returning('id');
  return await execute(query, true);
}

/**
 * Selects crud audits based on the given filters. Note that the `tableItem` filters is not applied if a table isn't
 * specified.
 *
 * @param filters
 * @returns Records matching the query
 */
export async function select(filters: CrudAuditQueryFilters): Promise<CrudAudit[]> {
  const { actor, table, tableItem } = filters;

  let query = db.selectFrom('crud_audits').selectAll();
  query = selectAudits(query, filters);

  if (actor) query = query.where('actorId', '=', actor);

  if (table) {
    query = query.where('originTable', '=', table);
    if (tableItem) query = query.where('tableItemId', '=', tableItem);
  }

  return await execute(query);
}
