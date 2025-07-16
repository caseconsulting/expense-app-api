import { Kysely } from 'kysely';
import { DataApiDialect } from 'kysely-data-api';
import { RDSData } from '@aws-sdk/client-rds-data';
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
  })
});
