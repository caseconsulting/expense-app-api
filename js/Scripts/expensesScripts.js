/*
 * node ./js/Scripts/expensesScripts.js dev
 * node ./js/Scripts/expensesScripts.js test
 * node ./js/Scripts/expensesScripts.js prod --profile prod
 */

// LIST OF ACTIONS
const actions = [
  '0. Cancel',
  '1. List all expenses',
  '2. Create a specified number of dummy expenses',
  '3. Delete all expenses'
];

// check for stage argument
if (process.argv.length < 3) {
  throw new Error('Must include a stage');
}

// set and validate stage
const STAGE = process.argv[2];
if (STAGE != 'dev' && STAGE != 'test' && STAGE != 'prod') {
  throw new Error('Invalid stage. Must be dev, test, or prod');
}

// set expense table
const TABLE = `${STAGE}-expenses`;

const uuid = require('uuid/v4');
const _ = require('lodash');
const readlineSync = require('readline-sync');

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const ddb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

// helper to get all entries in dynamodb table
const getAllEntriesHelper = (params, out = []) => new Promise((resolve, reject) => {
  ddb.scan(params).promise()
    .then(({Items, LastEvaluatedKey}) => {
      out.push(...Items);
      !LastEvaluatedKey ? resolve(out)
        : resolve(getAllEntriesHelper(Object.assign(params, {ExclusiveStartKey: LastEvaluatedKey}), out));
    })
    .catch(reject);
});

// get all entries in dynamodb table
function getAllEntries() {
  console.log('Getting all entries in dynamodb expenses table');
  let params = {
    TableName: TABLE,
  };
  let entries = getAllEntriesHelper(params);
  console.log('Finished getting all entries');
  return entries;
}

// Used for testing dynamo limitations - populates data table with expenses
function createItems(numberOfItems) {
  for (let i = 0; i < numberOfItems; i++) {
    let newId = uuid();
    let params = {
      TableName: TABLE,
      Item: {
        id: newId,
        categories: 'test category',
        cost: 1,
        createdAt: '2020-03-23',
        description: 'test description',
        expenseTypeId: '891ed076-65fd-4810-8988-e30e770c7c95', // technology
        note: 'test note',
        purchaseDate: '2020-03-23',
        receipt: 'testReceipt.jpeg',
        reimbursedDate: '2020-03-23',
        url: 'https://testUrl.com',
        userId: 'c722279e-2e11-43bb-a1d2-4999e8a98a6c' // info account
      }
    };
    ddb.put(params, function(err) {
      if (err) {
        console.error('Unable to create item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        console.log(`Created dummy expense with id: ${newId}`);
      }
    });
  }
}

// Used for testing dynamo limitations - deletes all expenses
async function deleteAllExpenses() {
  let expenses = await getAllEntries();
  _.forEach(expenses, expense => {
    let params = {
      TableName: TABLE,
      Key: {
        'id': expense.id
      }
    };

    ddb.delete(params, function(err) {
      if (err) {
        console.error('Unable to delete item. Error JSON:', JSON.stringify(err, null, 2));
      }
    });
  });
}

/*
 * User chooses an action
 */
function chooseAction() {
  let input;
  let valid;

  let prompt = `ACTIONS - ${STAGE}\n`;
  actions.forEach(item => {
    prompt += `${item}\n`;
  });
  prompt += `Select an action number [0-${actions.length - 1}]`;

  input = readlineSync.question(`${prompt} `);
  valid = !isNaN(input);
  if (valid) {
    input = parseInt(input);
    if (input < 0 || input > actions.length) {
      valid = false;
    }
  }

  while (!valid) {
    input = readlineSync.question(`\nInvalid Input\n${prompt} `);
    valid = !isNaN(input);
    if (valid) {
      input = parseInt(input);
      if (input < 0 || input > actions.length - 1) {
        valid = false;
      }
    }
  }
  return input;
}

/*
 * Prompts the user and confirm action
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
}

function getNumExpenses() {
  let input;
  let valid;

  let prompt = 'How many expenses do you want to create?';

  input = readlineSync.question(`${prompt} `);
  valid = !isNaN(input);
  if (valid) {
    input = parseInt(input);
    if (input < 0) {
      valid = false;
    }
  }

  while (!valid) {
    input = readlineSync.question(`\nInvalid Input\n${prompt} `);
    valid = !isNaN(input);
    if (valid) {
      input = parseInt(input);
      if (input < 0) {
        valid = false;
      }
    }
  }
  return input;
}

/**
 * main - action selector
 */
async function main() {
  switch (chooseAction()) {
    case 0:
      break;
    case 1:
      if (confirmAction('list all expenses')) {
        console.log('Listing all expenses');
        console.log(await getAllEntries());
      }
      break;
    case 2:
      if (confirmAction('create a specified number of dummy expenses')) {
        let numExpenses = getNumExpenses();
        console.log(`creating ${numExpenses} dummy expenses`);
        createItems(numExpenses);
      }
      break;
    case 3:
      if (confirmAction('delete all expenses')) {
        console.log('Deleting all expenses');
        deleteAllExpenses();
      }
      break;
    default:
      throw new Error('Invalid Action Number');
  }
}

main();
