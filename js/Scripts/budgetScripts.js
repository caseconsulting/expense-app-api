/*
 * node ./js/Scripts/budgetScripts.js dev
 * node ./js/Scripts/budgetScripts.js test
 * node ./js/Scripts/budgetScripts.js prod --profile prod
 */

// LIST OF ACTIONS
const actions = [
  '0. Cancel',
  '1. Set the amount of all budgets based on employee work status and expense type'
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

// set budgets table
const TABLE = `${STAGE}-budgets`;

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
  console.log('Getting all entries in dynamodb budgets table');
  let params = {
    TableName: TABLE,
  };
  let entries = getAllEntriesHelper(params);
  console.log('Finished getting all entries');
  return entries;
}

function hasAccess(employee, expenseType) {
  if (employee.workStatus == 0) {
    return false;
  } else if (expenseType.accessibleBy == 'ALL') {
    return true;
  } else if (expenseType.accessibleBy == 'FULL TIME') {
    return employee.workStatus == 100;
  } else if (expenseType.accessibleBy == 'PART TIME') {
    return employee.workStatus > 0 && employee.workStatus < 100;
  } else {
    return expenseType.accessibleBy.includes(employee.id);
  }
}

/*
 * Get all expense types
 */
async function getAllExpenseTypes() {
  let param = {
    TableName: `${STAGE}-expense-types`
  };
  return getAllEntriesHelper(param);
}

const expenseTypes = getAllExpenseTypes();

async function getExpenseType(expenseTypeId) {
  return _.find(await expenseTypes, ['id', expenseTypeId]);
}

/*
 * Get all employees
 */
 async function getAllEmployees() {
  let param = {
    TableName: `${STAGE}-employees`
  };
  return getAllEntriesHelper(param);
}

const employees = getAllEmployees();

async function getEmployee(employeeId) {
  return _.find(await employees, ['id', employeeId]);
}

async function calculateAdjustedBudget(budget) {
  let expenseType = await getExpenseType(budget.expenseTypeId);
  let employee = await getEmployee(budget.userId);
  if (expenseType && employee && hasAccess(employee, expenseType)) {
    return (expenseType.budget * (employee.workStatus / 100.0)).toFixed(2);
  } else {
    return 0;
  }
}

/**
 * Sets the amount of all budgets to 100% of its expense type
 */
async function maxAmount() {
  let budgets = await getAllEntries();
  _.forEach(budgets, async budget => {
    let amount = await calculateAdjustedBudget(budget);
    let params = {
      TableName: TABLE,
      Key: {
        'id': budget.id
      },
      UpdateExpression: 'set amount = :a',
      ExpressionAttributeValues: {
        ':a': amount
      },
      ReturnValues: 'UPDATED_NEW'
    };

    // update employee
    ddb.update(params, function(err, data) {
      if (err) {
        console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        console.log(`Item Updated\n  Budget ID: ${budget.id}\n  Amount: ${data.Attributes.amount}`);
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

/**
 * main - action selector
 */
async function main() {
  switch (chooseAction()) {
    case 0:
      break;
    case 1:
      if (confirmAction('set the amount of all budgets based on employee work status and expense type?')) {
        console.log('Setting the amount of all budgets based on employee work status and expense type');
        maxAmount();
      }
      break;
    default:
      throw new Error('Invalid Action Number');
  }
}

main();
