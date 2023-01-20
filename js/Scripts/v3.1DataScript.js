/*
 * node ./js/Scripts/v3.1DataScript.js dev
 * node ./js/Scripts/v3.1DataScript.js test
 * node ./js/Scripts/v3.1DataScript.js prod (must set aws credentials for prod as default)
 */

// check for stage argument
if (process.argv.length < 3) {
  throw new Error('Must include a stage');
}

// set and validate stage
const STAGE = process.argv[2];
if (STAGE != 'dev' && STAGE != 'test' && STAGE != 'prod') {
  throw new Error('Invalid stage. Must be dev, test, or prod');
}

const BUDGETS_TABLE = `${STAGE}-budgets`;
const EMPLOYEES_TABLE = `${STAGE}-employees`;
const EXPENSES_TABLE = `${STAGE}-expenses`;
const EXPENSE_TYPES_TABLE = `${STAGE}-expense-types`;
const TRAINING_URLS_TABLE = `${STAGE}-training-urls`;

const _ = require('lodash');
// const { v4: uuid } = require('uuid');
const readlineSync = require('readline-sync');
const Budget = require('./../../models/budget.js');
const Employee = require('./../../models/employee.js');
const Expense = require('./../../models/expense.js');
const ExpenseType = require('./../../models/expenseType.js');
const TrainingUrl = require('./../../models/trainingUrls.js');

// const ISOFORMAT = 'YYYY-MM-DD';

const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

/**
 * Async function to loop an array.
 *
 * @param array - Array of elements to iterate over
 * @param callback - callback function
 */
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
} // asyncForEach

// helper to get all entries in dynamodb table
const getAllEntriesHelper = (params, out = []) =>
  new Promise((resolve, reject) => {
    ddb
      .scan(params)
      .promise()
      .then(({ Items, LastEvaluatedKey }) => {
        out.push(...Items);
        !LastEvaluatedKey
          ? resolve(out)
          : resolve(getAllEntriesHelper(Object.assign(params, { ExclusiveStartKey: LastEvaluatedKey }), out));
      })
      .catch(reject);
  });

/**
 * gets all the entries in the table
 *
 * @param table - the table
 * @return - all the entries
 */
function getAllEntries(table) {
  console.log(`Getting all entries from dynamodb ${table} table`);
  let params = {
    TableName: table
  };
  let entries = getAllEntriesHelper(params);
  console.log(`Finished getting all entries from ${table}`);
  return entries;
} // getAllEntries

/**
 * Prompts the user and confirm action
 *
 * @param prompt - the string representing the action
 * @return boolean - whether the option is or isn't confirmed
 */
function confirmAction(prompt) {
  let input;

  input = readlineSync.question(`\nAre you sure you want to ${prompt}[y/n] `);
  input = input.toLowerCase();

  while (input != 'y' && input != 'yes' && input != 'n' && input != 'no') {
    input = readlineSync.question(`\nInvalid Input\nAre you sure you want to ${prompt} [y/n] `);
    input = input.toLowerCase();
  }
  if (input == 'y' || input == 'yes') {
    return true;
  } else {
    console.log('Action Canceled');
    return false;
  }
} // confirmAction

/**
 * Remove empty attributes (null or single space) from table entries
 *
 * @param table - the table to remobe attributes from
 */
async function removeNull(table) {
  console.log(`Removing empty attributes from ${table}`);
  let entriesData = await getAllEntries(table);

  let entries;

  if (table == BUDGETS_TABLE) {
    entries = _.map(entriesData, (entry) => {
      return new Budget(entry);
    });
  } else if (table == EMPLOYEES_TABLE) {
    entries = _.map(entriesData, (entry) => {
      return new Employee(entry);
    });
  } else if (table == EXPENSES_TABLE) {
    entries = _.map(entriesData, (entry) => {
      return new Expense(entry);
    });
  } else if (table == EXPENSE_TYPES_TABLE) {
    entries = _.map(entriesData, (entry) => {
      return new ExpenseType(entry);
    });
  } else if (table == TRAINING_URLS_TABLE) {
    entries = _.map(entriesData, (entry) => {
      return new TrainingUrl(entry);
    });
  }

  if (table == TRAINING_URLS_TABLE) {
    await asyncForEach(entries, async (entry) => {
      let params = {
        TableName: table,
        Item: entry
      };
      ddb.put(params, function (err) {
        if (err) {
          console.error('Unable to remove null item. Error JSON:', JSON.stringify(err, null, 2));
        } else {
          console.log(`Removed null attributes from entry with id: ${entry.id} category: ${entry.category}`);
        }
      });
    });
  } else {
    await asyncForEach(entries, async (entry) => {
      let params = {
        TableName: table,
        Item: entry
      };
      ddb.put(params, function (err) {
        if (err) {
          console.error('Unable to remove null item. Error JSON:', JSON.stringify(err, null, 2));
        } else {
          console.log(`Removed null attributes from entry with id: ${entry.id}`);
        }
      });
    });
  }

  console.log(`Finished removing empty attributes from ${table}`);
} // removeNull

/**
 * main - action selector
 */
async function main() {
  if (confirmAction('update expense app dynamodb data for v3.1?')) {
    await removeNull(BUDGETS_TABLE); // remove null attributes from budgets table
    await removeNull(EMPLOYEES_TABLE); // remove null attributes from employees table
    await removeNull(EXPENSES_TABLE); // remove null attributes from expenses table
    await removeNull(EXPENSE_TYPES_TABLE); // remove null attributes from expense type table
    await removeNull(TRAINING_URLS_TABLE); // remove null attributes from training url table
  } else {
    console.log('Canceled Update');
  }
} // main

main();
