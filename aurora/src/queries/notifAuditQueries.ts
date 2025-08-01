import { db } from '../index';
import { NotificationAudit } from '../models';
import { NotifAuditQueryFilters } from '../types';
import { execute, selectAudits } from './utils';

/**
 * Inserts a record into the notifications table
 *
 * @param audit The audit to insert
 * @returns The id of the new audit
 */
export async function insert(audit: NotificationAudit): Promise<number> {
  const query = db.insertInto('notifications').values(audit.asInsertable).returning('id');
  return await execute(query, true);
}

/**
 * Selects crud audits based on the given filters
 *
 * @param filters
 * @returns Records matching the query
 */
export async function select(filters: NotifAuditQueryFilters): Promise<NotificationAudit[]> {
  const { receiver } = filters;

  let query = db.selectFrom('notifications').selectAll();
  query = selectAudits(query, filters);
  if (receiver) query = query.where('receiverId', '=', receiver);
  return await execute(query);
}
