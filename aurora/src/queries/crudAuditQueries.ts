import { getDb, getLog } from '..';
import { CrudAudit } from '../models';
import { CrudAuditLike, CrudAuditQueryFilters, PortalRole } from '../types';
import { execute, selectAudits } from './utils';

/**
 * Inserts a record into the crud_audits table
 *
 * @param audit The audit to insert
 * @returns The id of the new audit
 */
export async function insert(audit: CrudAudit): Promise<{ id: number }> {
  const query = getDb().insertInto('crudAudits').values(audit.asInsertable).returning('id');
  return execute(query, true);
}

/**
 * Selects crud audits based on the given filters. Note that the `tableItem` filter is not applied if a table isn't
 * specified.
 *
 * @param filters
 * @returns Records matching the query
 */
export async function select(filters: CrudAuditQueryFilters): Promise<CrudAudit[]> {
  const { actor, table, tableItem } = filters;

  let query = getDb().selectFrom('crudAudits').selectAll();
  query = selectAudits(query, filters);

  if (actor) query = query.where('actorId', '=', actor);

  if (table) {
    query = query.where('originTable', '=', table);
    if (tableItem) query = query.where('tableItemId', '=', tableItem);
  }

  return await execute(query);
}

function fromAuditLike(auditLike: CrudAuditLike) {
  const { employee, table, oldImage, newImage } = auditLike;
  const objectId = (newImage ?? oldImage).id;
  return new CrudAudit(
    undefined,
    undefined,
    employee.id,
    employee.employeeRole as PortalRole,
    table,
    objectId,
    oldImage,
    newImage
  );
}

/**
 * Records a change
 *
 * @param audit Object containing required data to record
 * @returns The id of the newly added audit
 */
export async function record(audit: CrudAuditLike) {
  const insertable = fromAuditLike(audit).asInsertable;

  try {
    const query = getDb().insertInto('crudAudits').values(insertable).returning('id');
    const { id }: { id: number } = await execute(query, true);
    return id;
  } catch (err) {
    getLog()(5, 'crudAuditQueries.record', 'Error executing query. Audit:', JSON.stringify(insertable), 'Error:', err);
    throw err;
  }
}
