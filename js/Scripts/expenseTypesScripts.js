/*
 * node ./js/Scripts/expenseTypesScripts.js dev
 * node ./js/Scripts/expenseTypesScripts.js test
 * node ./js/Scripts/expenseTypesScripts.js prod --profile prod
 */

// LIST OF ACTIONS
const actions = [
  '0. Cancel',
  '1. Set all expense type\'s accessible by value to \'ALL\'',
  '2. Change expense type categories to JSON objects',
  '3. Add alwaysOnFeed to DynamoDB table'
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

// set expense types table
const TABLE = `${STAGE}-expense-types`;

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
  console.log('Getting all entries in dynamodb expense type table');
  let params = {
    TableName: TABLE,
  };
  let entries = getAllEntriesHelper(params);
  console.log('Finished getting all entries');
  return entries;
}

/**
 * Sets all expense type's accessible by value to 'ALL'
 */
async function accessibleByAll() {
  let expenseTypes = await getAllEntries();
  _.forEach(expenseTypes, expenseType => {
    let params = {
      TableName: TABLE,
      Key: {
        'id': expenseType.id
      },
      UpdateExpression: 'set accessibleBy = :a',
      ExpressionAttributeValues: {
        ':a': 'ALL'
      },
      ReturnValues: 'UPDATED_NEW'
    };

    // update expense type
    ddb.update(params, function(err) {
      if (err) {
        console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        console.log(`Updated expense type id ${expenseType.id}`);
      }
    });
  });
}

async function addAlwaysOnFeed() {
  let expenseTypes = await getAllEntries();
  _.forEach(expenseTypes, expenseType => {
    let params = {
      TableName: TABLE,
      Key: {
        'id': expenseType.id
      },
      UpdateExpression: 'set alwaysOnFeed = :a',
      ExpressionAttributeValues: {
        ':a': false
      },
      ReturnValues: 'UPDATED_NEW'
    };

    // update expense type
    ddb.update(params, function(err) {
      if (err) {
        console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        console.log(`Updated expense type id ${expenseType.id}`);
      }
    });
  });
}

/**
 * changes expense types with string categories to JSON objects.
 */
async function categoryFixer() {
  let expenseTypes = await getAllEntries();
  _.forEach(expenseTypes, expenseType => {
    let categories = [];
    _.forEach(expenseType.categories, category => {
      try {
        JSON.parse(category);
        categories.push(category);
      } catch(err) {
        let categoryObj = {name: category, showOnFeed: false};
        categories.push(categoryObj);
      }
    });
    let params = {
      TableName: TABLE,
      Key: {
        'id': expenseType.id
      },
      UpdateExpression: 'set categories = :a',
      ExpressionAttributeValues: {
        ':a': categories
      },
      ReturnValues: 'UPDATED_NEW'
    };

    // update expense type
    ddb.update(params, function(err) {
      if (err) {
        console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        console.log(`Updated expense type id ${expenseType.id}`);
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
      if (confirmAction('set all expense type\'s accessible by value to \'ALL\'?')) {
        console.log('Setting all expense type\'s accessible by value to \'ALL\'');
        accessibleByAll();
      }
      break;
    case 2:
      if(confirmAction('Change expense type categories to JSON objects')) {
        console.log('Changing expense type categories to JSON objects');
        categoryFixer();
      }
      break;
    case 3:
      if(confirmAction('Add alwaysOnFeed to DynamoDB table')) {
        console.log('Adding alwaysOnFeed to DynamoDB table');
        addAlwaysOnFeed();
      }
      break;
    default:
      throw new Error('Invalid Action Number');
  }
}

main();
