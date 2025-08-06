import { sql } from 'kysely';

import { db } from '..';
import { execute } from './utils';

export async function wakeUp(): Promise<number> {
  const { '?column?': result } = await execute(db.selectFrom('crudAudits').select(sql`1` as any), true, 1);
  return result;
}
