import { DescribeDBClustersCommand, RDSClient } from '@aws-sdk/client-rds';
import { RDSData } from '@aws-sdk/client-rds-data';
import { CamelCasePlugin, Kysely } from 'kysely';
import { DataApiDialect } from 'kysely-data-api';
import { Database } from './types';

/**
 * The Kysely instance to create and send queries. In most cases, `getDb()` should be used instead.
 *
 * @private
 */
export let db: Kysely<Database>;

/**
 * Getter for the module's Kysely instance
 */
export function getDb() {
  return db;
}

/**
 * Logs a message to the console. In mose cases, `getLog()` should be used instead.
 *
 * @param priority Log priority level
 * @param func Name of the function in which this was called
 * @param args Messages to print
 *
 * @private
 */
export let log = (priority: number, func: string, ...args: any[]) => {
  console.log(`(${priority}) ${func}:`, ...args);
};

/**
 * Getter for the module's logging function
 */
export function getLog() {
  return log;
}

/**
 * Initializes the module. Must be called before anything in this module is used. Depends on the STAGE environment variable being set.
 */
export async function initialize(config?: {
  db?: Kysely<Database>;
  log?: (priority: number, func: string, ...args: any[]) => void;
}) {
  const stage = process.env.STAGE;
  const clusterId = `${stage}-expense-app-db-cluster`;
  const region = 'us-east-1';

  const rdsClient = new RDSClient({ region }); // not to be confused with RDSDataClient
  const command = new DescribeDBClustersCommand({
    DBClusterIdentifier: clusterId
  });
  const data = await rdsClient.send(command);

  if (data.DBClusters?.length == 0) {
    throw new Error(`Could not find cluster with id ${clusterId}`);
  }

  const cluster = data.DBClusters[0];
  const clusterArn = cluster.DBClusterArn;
  const secretArn = cluster.MasterUserSecret?.SecretArn;

  if (!secretArn) {
    throw new Error(`Could not get managed secret for cluster ${clusterId}`);
  }

  if (config?.log) {
    log = config.log;
  }

  if (config && config.db) db = config.db;
  else {
    db = new Kysely<Database>({
      dialect: new DataApiDialect({
        mode: 'postgres',
        driver: {
          client: new RDSData(),
          database: `${stage}_expense_app_db`,
          resourceArn: clusterArn,
          secretArn: secretArn
        }
      }),
      plugins: [new CamelCasePlugin()]
    });
  }
}
