const { RDSDataClient, ExecuteStatementCommand, DatabaseResumingException } = require('@aws-sdk/client-rds-data');
const dotenv = require('dotenv');
dotenv.config();

const secretArn = process.env.AURORA_SECRET_ARN;
const clusterArn = process.env.AURORA_CLUSTER_ARN;
const dbName = process.env.AURORA_DB_NAME;

// common inputs for commands
const inputs = {
  resourceArn: clusterArn,
  secretArn: secretArn,
  database: dbName
};

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
 * @param {string | undefined} transactionId If this query is part of a transaction, specify here
 *
 * @throws The error received by the client, unless it's a DatabaseResumingException
 * @returns {Promise<import('@aws-sdk/client-rds-data').ExecuteStatementCommandOutput>} The client's response
 */
async function query(client, query, transactionId) {
  const command = new ExecuteStatementCommand({ ...inputs, sql: query });
  if (transactionId) command.input.transactionId = transactionId;

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
        console.log('Database is resuming, trying again in 5 seconds');
        retry = true;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else throw err;
    }
  } while (retry);
}

// async function transact(client, commands) {
//   const begin = new BeginTransactionCommand(inputs);
//   const tid = begin['transactionId'];
//   const responses = {};
//   client.send(begin);
//
//   let ok = true;
//
//   for (let sql of commands) try {
//     const res = await query(client, sql, tid);
//     responses[sql] = res;
//   } catch (err) {
//     ok = false;
//     break;
//   }
//
//   if (ok) {
//     const commit = new CommitTransactionCommand({ ...inputs, transactionId: tid });
//     client.send(commit);
//   }
//
//   responses.ok = true;
//   return responses;
// }

async function main() {
  const client = connect();

  try {
    const result = await query(client, 'select now()');
    console.log('Success! Response:');
    console.log(result.records);
  } finally {
    client.destroy();
  }
}

main();
