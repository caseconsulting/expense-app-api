// In general, these are meant to be internal helper funcitons within this module and not intended for use elsewhere in
// the codebase

import { DatabaseResumingException } from '@aws-sdk/client-rds-data';
import { InsertQueryBuilder, SelectQueryBuilder, sql } from 'kysely';

import { db, log } from '..';
import { AuditQueryFilters, Database } from '../types';

/**
 * Sends a query and automatically retries if the database is resuming
 *
 * @param query A query built with kysely
 * @param takeFirst Whether to automatically return the first element in the response array. Default false
 * @param waitFor Nmber of seconds to wait before retrying. Default 5
 * @returns The command response
 * @throws Any error thrown other than a DatabaseResumingException
 */
export async function execute<Table extends keyof Database, Return>(
  query: InsertQueryBuilder<Database, Table, Return> | SelectQueryBuilder<Database, Table, Return>,
  takeFirst = false,
  waitFor: number = 5
): Promise<any> {
  let retry: boolean;
  do {
    retry = false;

    try {
      if (takeFirst) return await query.executeTakeFirst();
      else return await query.execute();
    } catch (err) {
      // if database is resuming, retry
      if (err instanceof DatabaseResumingException) {
        log(1, 'utils.execute', `Database is resuming. Trying again in ${waitFor} seconds...`);
        retry = true;
        await new Promise((resolve) => setTimeout(resolve, waitFor * 1000));
      } else {
        // log so we can know where the error originated
        log(5, 'utils.execute', 'Error executing query: ', err);
        throw err; // propagate the error because we don't know how to handle it here
      }
    }
  } while (retry);
}

/**
 * Applies common filters for all audit select query types (limit, start date, end date). Orders by most recent first.
 * Use `query.clearOrderBy()` to remove this.
 *
 * @param query
 * @param filters
 * @returns The query builder
 */
export function selectAudits<TABLE extends keyof Database, RETURN>(
  query: SelectQueryBuilder<Database, TABLE, RETURN>,
  filters: AuditQueryFilters
): SelectQueryBuilder<Database, TABLE, RETURN> {
  const { ref } = db.dynamic;
  const { limit, startDate, endDate } = filters;

  if (startDate && endDate) query = query.where(sql<boolean>`${ref('createdAt')} between ${startDate} and ${endDate}`);
  else if (startDate) query = query.where(ref('createdAt'), '>=', startDate);
  else if (endDate) query = query.where(ref('createdAt'), '<=', endDate);

  if (limit) query = query.limit(limit);

  return query.orderBy(sql.ref('createdAt'), 'desc');
}
