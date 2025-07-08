// In general, these are meant to be internal helper funcitons within this module and not intended for use elsewhere in
// the codebase

import { DatabaseResumingException } from '@aws-sdk/client-rds-data';
import { InsertQueryBuilder, SelectQueryBuilder, sql } from 'kysely';
import { AuditQueryFilters, Database } from '../types';
import { db } from '..';

/**
 * Sends a query and automatically retries if the database is resuming
 *
 * @param query A query built with kysely
 * @param takeFirst Whether to automatically return the first element in the response array. Default false
 * @param waitFor Nmber of seconds to wait before retrying. Default 5
 * @returns The command response
 * @throws Any error thrown other than a DatabaseResumingException
 */
export async function execute<TABLE extends keyof Database, RETURN>(
  query: InsertQueryBuilder<Database, TABLE, RETURN> | SelectQueryBuilder<Database, TABLE, RETURN>,
  takeFirst: boolean = false,
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
        console.log(`Database is resuming, trying again in ${waitFor} seconds...`);

        retry = true;
        await new Promise((resolve) => setTimeout(resolve, waitFor * 1000));
      } else throw err; // else propagate the error
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

  if (startDate && endDate) query = query.where(sql<boolean>`${ref('created_at')} between ${startDate} and ${endDate}`);
  else if (startDate) query = query.where(ref('created_at'), '>=', startDate);
  else if (endDate) query = query.where(ref('created_at'), '<=', endDate);

  if (limit) query = query.limit(limit);

  return query.orderBy(sql.ref('created_at'), 'desc');
}
