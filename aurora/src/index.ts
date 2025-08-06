import { RDSData } from '@aws-sdk/client-rds-data';
import { CamelCasePlugin, Kysely } from 'kysely';
import { DataApiDialect } from 'kysely-data-api';

import { Database } from './types';

export const db = new Kysely<Database>({
  dialect: new DataApiDialect({
    mode: 'postgres',
    driver: {
      client: new RDSData(),
      database: `${process.env.STAGE}_expense_app_db`,
      resourceArn: process.env.AURORA_CLUSTER_ARN,
      secretArn: process.env.AURORA_SECRET_ARN
    }
  }),
  plugins: [new CamelCasePlugin()]
});

/**
 * The log function used in this module. This has a default implementation but should be overidden.
 *
 * @param priority Log priority level
 * @param func Name of the function in which this was called
 * @param args Messages to print
 */
export let log = (priority: number, func: string, ...args: any[]) => {
  console.log(`(${priority}) ${func}:`, ...args);
};
