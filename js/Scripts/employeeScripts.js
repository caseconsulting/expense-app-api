/*
 * node ./js/Scripts/employeeScripts.js dev
 * node ./js/Scripts/employeeScripts.js test
 * node ./js/Scripts/employeeScripts.js prod --profile prod
 */

// LIST OF ACTIONS
const actions = [
  '0. Cancel',
  '1. Sets all employee\'s work status active = 100 (Full Time) or inactive = 0',
  '2. Removes isInactive attribute from all employees',
  '3. Removes expenseTypes attribute from all employees'
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

// set employee table
const TABLE = `${STAGE}-employees`;

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
  console.log('Getting all entries in dynamodb employees table');
  let params = {
    TableName: TABLE,
  };
  let entries = getAllEntriesHelper(params);
  console.log('Finished getting all entries');
  return entries;
}

/**
 * Sets all employee's work status active = 100 (Full Time) or inactive = 0
 */
async function workStatusActive() {
  let employees = await getAllEntries();
  _.forEach(employees, employee => {
    let params = {
      TableName: TABLE,
      Key: {
        'id': employee.id
      },
      UpdateExpression: 'set workStatus = :ws',
      ExpressionAttributeValues: {
        ':ws': 100
      },
      ReturnValues: 'UPDATED_NEW'
    };

    if (employee.isInactive) {
      params.ExpressionAttributeValues = {
        ':ws': 0
      };
    }

    // update employee
    ddb.update(params, function(err, data) {
      if (err) {
        console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        console.log(`Item Updated\n  Employee ID: ${employee.id}\n  Work Status: ${data.Attributes.workStatus}`);
      }
    });
  });
}

/**
 * Removes given attribute from all employee data
 */
async function removeAttribute(attribute) {
  let employees = await getAllEntries();
  _.forEach(employees, employee => {
    let params = {
      TableName: TABLE,
      Key: {
        'id': employee.id
      },
      UpdateExpression: `remove ${attribute}`,
      ReturnValues: 'UPDATED_NEW'
    };

    // update employee
    ddb.update(params, function(err) {
      if (err) {
        console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        console.log(`Refreshed Employee ID: ${employee.id}`);
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
      if (confirmAction('set all employee\'s work status active = 100 (Full Time) or inactive = 0?')) {
        console.log('Setting all employee\'s work status active = 100 (Full Time) or inactive = 0');
        workStatusActive();
      }
      break;
    case 2:
      if (confirmAction('remove isInactive attribute from all employees?')) {
        console.log('Removing isInactive attribute from all employees');
        removeAttribute('isInactive');
      }
      break;
    case 3:
      if (confirmAction('remove expenseType attribute from all employees?')) {
        console.log('Removing expenseTypes attribute from all employees');
        removeAttribute('expenseTypes');
      }
      break;
    default:
      throw new Error('Invalid Action Number');
  }
}

main();
