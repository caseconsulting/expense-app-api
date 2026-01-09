// handles unhandled rejection errors
process.on('unhandledRejection', (error) => {
  console.error('unhandledRejection', error);
});

// set and validate stage
if (process.argv.length < 3) {
  throw new Error('Must include a stage');
}
const STAGE = process.argv[2];
if (STAGE != 'dev' && STAGE != 'test' && STAGE != 'prod') {
  throw new Error('Invalid stage. Must be dev, test, or prod');
}

// set employee table
const EMPLOYEES_TABLE = `${STAGE}-employees`;
const SENSITIVE_TABLE = `${STAGE}-employees-sensitive`;
const GIFTCARDS_TABLE = `${STAGE}-gift-cards`;
const EXPENSESS_TABLE = `${STAGE}-expenses`;
const EXP_TYPES_TABLE = `${STAGE}-expense-types`;

// imports
import readlineSync from 'readline-sync';

// set up AWS DynamoDB
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ apiVersion: '2012-08-10', region: 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(client, {marshallOptions: { convertClassInstanceToMap: true }});

import DatabaseModify from '../../js/databaseModify.js';


// set up s3
import { CopyObjectCommand, ListObjectsCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

// colors for console logging
const colors = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  YELLOW: '\x1b[33m',
  BOLD: '\x1b[1m',
  NC: '\x1b[0m' // clear
};

/**
 * =================================================
 * |                                               |
 * |            Begin helper functions             |
 * |                                               |
 * =================================================
 */

/**
 * helper to get all entries in dynamodb table
 */
const getAllEntriesHelper = (params, out = []) =>
  new Promise((resolve, reject) => {
    ddb
      .send(new ScanCommand(params))
      .then(({ Items, LastEvaluatedKey }) => {
        out.push(...Items);
        !LastEvaluatedKey
          ? resolve(out)
          : resolve(getAllEntriesHelper(Object.assign(params, { ExclusiveStartKey: LastEvaluatedKey }), out));
      })
      .catch(reject);
  });

/**
 * get all entries in dynamodb table
 *
 * @return - all the entries in the table
 */
function getAllEntries(table) {
  let params = {
    TableName: table
  };
  let entries = getAllEntriesHelper(params);
  return entries;
}

/**
 * Main boi
 */
async function main() {
  // get tables: gift cards, expenses, employees
  console.log('\nFetching tables...\n');
  let [expenseTypes, employees, giftcards, expenses] = await Promise.all([
    getAllEntries(EXP_TYPES_TABLE),
    getAllEntries(EMPLOYEES_TABLE),
    getAllEntries(GIFTCARDS_TABLE),
    getAllEntries(EXPENSESS_TABLE),
  ]);

  // find high five expense types
  let hfExpenseTypeIds = new Set();
  for (let et of expenseTypes)
    if (et.budgetName === 'High Five')
      hfExpenseTypeIds.add(et.id);

  // make employees indexable by ID
  let employeesIndex = {};
  for (let { id, ...rest } of employees)
    employeesIndex[id] = rest;

  // make gift cards indexable by ID
  let giftcardsIndex = {};
  for (let { expenseId, ...rest } of giftcards)
    giftcardsIndex[expenseId] = rest;
  
  // get details of High Fives and their gift cards
  let rollup = [];
  let lengths = {
    giver: 0,
    recipient: 0,
    sentDate: 0,
    genDate: 0,
    genSuccess: 0,
    genEmail: 0
  };
  for (let expense of expenses) {
    // skip non-high-fives
    if (!hfExpenseTypeIds.has(expense.expenseTypeId)) continue;

    let giftcard = giftcardsIndex[expense.id];
    let name = (e) => `${e?.nickname || e?.firstName || 'unknown'} ${e?.lastName || 'unknown'}`;

    // get details of high fives
    let giver = name(employeesIndex[expense.employeeId]);
    let recipient = name(employeesIndex[expense.recipient]);
    let sentDate = expense.createdAt;
    let genDate = expense.reimbursedDate;
    let genSuccess = giftcard?.status;
    let genEmail = giftcard?.emailSent ? 'SUCCESS' : 'FAILURE';

    let highFive = {
      giftcard,
      expense,
      giver,
      recipient,
      sentDate,
      genDate,
      genSuccess,
      genEmail,
    };

    // update lengths
    for (let k of Object.keys(highFive))
      if (lengths[k] < (highFive[k]?.length || 0))
        lengths[k] = highFive[k].length;

    rollup.push(highFive);

    // print out details
    // let toPrint = `${giver} gave ${recipient} a high five on ${sentDate}`;
    // if (genDate) toPrint += `, GC made on ${genDate} (${genSuccess}) and email sent ${genEmail}`;
    // else toPrint += ', and no GC has been generated yet';
    // console.log(toPrint);
  }

  // sort
  rollup = rollup.sort((a, b) => {
    let by = 'sentDate';
    if (a[by] < b[by]) return 1;
    if (a[by] > b[by]) return -1;
    return 0;
  });

  // pretty print high five
  function print(hf) {
    // console.log(hf.expId);
    // console.log(`${hf.giver} gave ${hf.recipient} a high five`);
    // console.log(`    Date: ${hf.sentDate}`);
    // if (hf.expense.reimbursedDate) {
    //   console.log(`   Gift card: ${hf.genSuccess} (${hf.genDate})`);
    //   console.log(`  Email sent: ${hf.genEmail}`);
    // }
    // console.log();

    if (hf.expense.reimbursedDate && !hf.giftcard) {
      console.log(`${hf.expense.id} (${hf.expense.reimbursedDate}) ${hf.giver} -> ${hf.recipient}`);
    }
  }

  for (let hf of rollup) {
    print(hf);
  }
}

await main();