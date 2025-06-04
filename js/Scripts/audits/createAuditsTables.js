const { RDSDataClient, ExecuteStatementCommand, DatabaseResumingException } = require('@aws-sdk/client-rds-data');
const dotenv = require('dotenv');
dotenv.config();

const secretArn = process.env.AURORA_SECRET_ARN;
const clusterArn = process.env.AURORA_CLUSTER_ARN;
const dbName = process.env.AURORA_DB_NAME;

/**
 * Create a new RDS data client. When done with the client, call `client.destroy()`
 * @returns {RDSDataClient} A new client
 */
function connect() {
  return new RDSDataClient({ region: 'us-east-1' });
}

/**
 * Sends a query to the database and returns its response
 *
 * @param {RDSDataClient} client The client to send the request to
 * @param {string} query The PostgreSQL query
 *
 * @throws The error received by the client, unless it's a DatabaseResumingException
 * @returns {import('@aws-sdk/client-rds-data').ExecuteStatementCommandOutput} The client's response
 */
async function query(client, query) {
  const command = new ExecuteStatementCommand({
    resourceArn: clusterArn,
    secretArn: secretArn,
    database: dbName,
    sql: query
  });

  let retry = false;
  do {
    try {
      const result = await client.send(command);
      return result;
    } catch (err) {
      // Aurora db pauses after inactivity. When it receives a request and is
      // paused, it will start resuming and throw this error
      if (err instanceof DatabaseResumingException) {
        // wait 5 seconds
        await new Promise((resolve) => setTimeout(resolve, 5000));
        retry = true;
      } else throw err;
    }
  } while (retry);
}

async function main() {
  const client = connect();

  try {
    const result = await query(client, 'SELECT NOW()');
    console.log('Success! Response:');
    console.log(result.records);

  } finally {
    client.destroy();
  }
}

main();
