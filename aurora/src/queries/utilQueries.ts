import { sql } from 'kysely';
import { db } from '..';
import { execute } from './utils';

export async function wakeUp(): Promise<number> {
  const { response } = await execute(
    db.selectFrom(sql<{ response: number }>`(select 1 as response)`.as('ping')).select('ping.response') as any,
    true,
    1
  );
  return response;
}
