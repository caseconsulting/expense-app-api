/** @typedef {import('../Logger.js')} Logger */
/** @typedef {import('../models/audits/audits.js').AuditRequestFilters} AuditRequestFilters */
/** @typedef {import('../models/audits/notification.js').Notification} Notification */
/** @typedef {import('@aws-sdk/client-rds-data').ExecuteStatementCommandOutput} ExecuteStatementCommandOutput */
/** @typedef {import('@aws-sdk/client-rds-data').SqlParameter} SqlParameter */

/** @type Logger */
const Logger = require(process.env.AWS ? 'Logger' : '../Logger');
const {
  DatabaseResumingException,
  ExecuteStatementCommand,
  RDSDataClient,
  BeginTransactionCommand,
  CommitTransactionCommand,
  RollbackTransactionCommand
} = require('@aws-sdk/client-rds-data');

const clusterArn = process.env.AURORA_CLUSTER_ARN;
const secretArn = process.env.AURORA_SECRET_ARN;
const dbName = process.env.AURORA_DB_NAME;

/**
 * A wrapper for RDSDataClient. Handles common configuration/functionality for `RDSDataClient`, as well as logging.
 *
 * All methods in this class should be wrapped in a try-catch. The only error handled by them is
 * DatabaseResumingException.
 */
class AuroraClient {
  constructor() {
    /** @type Logger */
    this.logger = new Logger('AuroraClient');

    /** @private @type RDSDataClient */
    this.client = new RDSDataClient({ region: 'us-east-1' });
  }

  /**
   * Sends a command to the database, and retries if the database is waking up
   *
   * @param {AuroraCommand} command The command state
   * @returns {Promise<ExecuteStatementCommandOutput | void>} The output of the command if any
   */
  async send(command) {
    const { sql, params, transaction } = command;

    const input = {
      resourceArn: clusterArn,
      secretArn: secretArn,
      database: dbName,
      sql: sql
    };
    let message = `Sending sql:\n\t${sql}`;

    if (params) {
      input.parameters = params;
      message += `\nWith params:\n\t${JSON.stringify(params)}`;
    }

    if (transaction) {
      input.transactionId = transaction.id;
      message += `\nIn transaction: ${transaction.id}`;
    }

    this.log('send', message);
    return await this.sendAndResume(new ExecuteStatementCommand(input));
  }

  /**
   * Begins a transaction
   * @returns {Promise<AuroraTransaction>} A handle to identify the transaction
   */
  async beginTransaction() {
    const command = new BeginTransactionCommand({
      resourceArn: clusterArn,
      secretArn: secretArn,
      database: dbName
    });

    const response = await this.sendAndResume(command);
    this.log('beginTransaction', `Beginning transaction with id: ${response.transactionId}`);
    return new AuroraTransaction(response.transactionId);
  }

  /**
   * Commits and ends the transaction. The transaction handle should not be used after this.
   * @param {AuroraTransaction} transaction The transaction handle
   * @returns {Promise<any>} The transaction status
   */
  async commitTransaction(transaction) {
    const command = new CommitTransactionCommand({
      resourceArn: clusterArn,
      secretArn: secretArn,
      transactionId: transaction.id
    });

    const { transactionStatus: status } = await this.sendAndResume(command);
    this.log('commitTransaction', `Transaction with id ${transaction.id} commited with status: ${status}`);
    transaction.id = undefined; // deletes the id to prevent it from being used
    return status;
  }

  /**
   * Rolls back and discards the transaction
   * @param {AuroraTransaction} transaction The transaction handle
   * @returns {Promise<string>} The transaction status
   */
  async rollbackTransaction(transaction) {
    const command = new RollbackTransactionCommand({
      resourceArn: clusterArn,
      secretArn: secretArn,
      transactionId: transaction.id
    });

    const { transactionStatus: status } = await this.sendAndResume(command);
    this.log('rollbackTransaction', `Transaction with id ${transaction.id} rolled back with status: ${status}`);
    transaction.id = undefined;
    return status;
  }

  // *✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫*
  // ❃                                                  ❃
  // ❇                     HELPERS                      ❇
  // ❉                                                  ❉
  // *✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫*

  /**
   * Sends a command to the data api. If the database needs to resume, wait and try again until successful
   *
   * @param {*} Any valid rds data api command object
   * @returns {*} The command response
   * @throws Any error thrown other than a DatabaseResumingException
   *
   * @private
   */
  async sendAndResume(command) {
    const waitFor = 5; // seconds to wait before retrying

    let retry; // loop condition
    do {
      retry = false;

      try {
        return await this.client.send(command);
      } catch (err) {
        // if database is resuming, retry
        if (err instanceof DatabaseResumingException) {
          this.log('sendAndResume', `Database is resuming, trying again in ${waitFor} seconds...`);

          retry = true;
          await new Promise((resolve) => setTimeout(resolve, waitFor * 1000));
        } else throw err; // else propagate the error
      }
    } while (retry);
  }

  /**
   * Log with level 3
   *
   * @param {string} func The name of the function
   * @param {string[]} message
   *
   * @private
   */
  log(func, ...message) {
    this.logger.log(3, func, ...message);
  }
}

class AuroraCommand {
  /**
   * @param {{ sql: string, params: SqlParameter[] | undefined, transaction: AuroraTransaction | undefined}} properties
   */
  constructor(properties) {
    /** @type string */
    this.sql = properties.sql;

    /** @type SqlParameter[] */
    this.params = properties.params;

    /** @type AuroraTransaction | undefined */
    this.transaction = properties.transaction;
  }
}

/**
 * A unique handle for an ongoing transaction. Should be used in any calls to send commands as part of the transaction.
 * Calling the commitTransaction method will invalidate this handle
 */
class AuroraTransaction {
  /**
   * @param {string} id The transaction id
   */
  constructor(id) {
    /** @type string */
    this.id = id;
  }
}

module.exports = { AuroraClient, AuroraCommand, AuroraTransaction };
