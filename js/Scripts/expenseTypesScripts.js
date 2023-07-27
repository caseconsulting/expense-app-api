/**
 * node ./js/Scripts/expenseTypesScripts.js dev
 * node ./js/Scripts/expenseTypesScripts.js test
 * node ./js/Scripts/expenseTypesScripts.js prod (must set aws credentials for prod as default)
 */

// handles unhandled rejection errors
process.on('unhandledRejection', (error) => {
  console.error('unhandledRejection', error);
});

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

// imports
const _ = require('lodash');
const readlineSync = require('readline-sync');

// set up  AWS DynamoDB
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ apiVersion: '2012-08-10', region: 'us-east-1' }));

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

// helper to get all entries in dynamodb table
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
 * gets all entries in the table
 *
 * @return - all the entries
 */
function getAllEntries() {
  console.log('Getting all entries in dynamodb expense type table');
  let params = {
    TableName: TABLE
  };
  let entries = getAllEntriesHelper(params);
  console.log('Finished getting all entries');
  return entries;
} // getAllEntries

/**
 * =================================================
 * |                                               |
 * |             End helper functions              |
 * |                                               |
 * =================================================
 */

/**
 * =================================================
 * |                                               |
 * |            Begin runnable scripts             |
 * |                                               |
 * =================================================
 */

/**
 * Sets all expense type's accessible by value to 'ALL'
 */
async function accessibleByAll() {
  let expenseTypes = await getAllEntries();
  _.forEach(expenseTypes, (expenseType) => {
    let params = {
      TableName: TABLE,
      Key: {
        id: expenseType.id
      },
      UpdateExpression: 'set accessibleBy = :a',
      ExpressionAttributeValues: {
        ':a': 'ALL'
      },
      ReturnValues: 'UPDATED_NEW'
    };

    // update expense type
    ddb
      .send(new UpdateCommand(params))
      .then(() => console.log(`Updated expense type id ${expenseType.id}`))
      .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
  });
} // accessibleByAll

/**
 * adds always on feed flag to entries
 */
async function addAlwaysOnFeed() {
  let expenseTypes = await getAllEntries();
  _.forEach(expenseTypes, (expenseType) => {
    let params = {
      TableName: TABLE,
      Key: {
        id: expenseType.id
      },
      UpdateExpression: 'set alwaysOnFeed = :a',
      ExpressionAttributeValues: {
        ':a': false
      },
      ReturnValues: 'UPDATED_NEW'
    };

    // update expense type
    ddb
      .send(new UpdateCommand(params))
      .then(() => console.log(`Updated expense type id ${expenseType.id}`))
      .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
  });
} // addAlwaysOnFeed

/**
 * changes expense types with string categories to JSON objects.
 */
async function categoryFixer() {
  let expenseTypes = await getAllEntries();
  _.forEach(expenseTypes, (expenseType) => {
    let categories = [];
    _.forEach(expenseType.categories, (category) => {
      try {
        JSON.parse(category);
        categories.push(category);
      } catch (err) {
        let categoryObj = { name: category, showOnFeed: false };
        categories.push(JSON.stringify(categoryObj));
      }
    });
    let params = {
      TableName: TABLE,
      Key: {
        id: expenseType.id
      },
      UpdateExpression: 'set categories = :a',
      ExpressionAttributeValues: {
        ':a': categories
      },
      ReturnValues: 'UPDATED_NEW'
    };

    // update expense type
    ddb
      .send(new UpdateCommand(params))
      .then(() => console.log(`Updated expense type id ${expenseType.id}`))
      .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
  });
} // categoryFixer

/**
 * Changes the older expense accessibility types to the new accessibility types.
 */
async function convertExpenseTypeAccessibilities() {
  let expenseTypes = await getAllEntries();
  let accessibleBy = [];
  let proRated = false;
  _.forEach(expenseTypes, (expenseType) => {
    if (expenseType.accessibleBy == 'FULL') {
      accessibleBy = ['FullTime', 'PartTime'];
      proRated = false;
    } else if (expenseType.accessibleBy == 'ALL') {
      accessibleBy = ['FullTime', 'PartTime'];
      proRated = true;
    } else if (expenseType.accessibleBy == 'FULL TIME') {
      accessibleBy = ['FullTime'];
      proRated = false;
    } else {
      accessibleBy = expenseType.accessibleBy.concat('Custom');
      proRated = false;
    }
    //accessibleBy = JSON.stringify(accessibleBy);
    let params = {
      TableName: TABLE,
      Key: {
        id: expenseType.id
      },
      UpdateExpression: 'set accessibleBy = :a, proRated = :b',
      ExpressionAttributeValues: {
        ':a': accessibleBy,
        ':b': proRated
      },
      ReturnValues: 'UPDATED_NEW'
    };

    // update expense type
    ddb
      .send(new UpdateCommand(params))
      .then(() => console.log(`Updated expense type id ${expenseType.id}`))
      .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
  });
} // convertExpenseTypeAccessibilities

/**
 * Removes given attribute from all expense type data
 *
 * @param attribute - the given attribute
 */
async function removeAttribute(attribute) {
  let expenseTypes = await getAllEntries(TABLE);
  _.forEach(expenseTypes, (expenseType) => {
    let params = {
      TableName: TABLE,
      Key: {
        id: expenseType.id
      },
      UpdateExpression: `remove ${attribute}`,
      ReturnValues: 'UPDATED_NEW'
    };

    // update expense
    ddb
      .send(new UpdateCommand(params))
      .then()
      .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
  });
} // removeAttribute

/**
 * Adds requireURL attribute to all expense type categories
 */
async function addRequireURLAttrToCategories() {
  let expenseTypes = await getAllEntries();
  _.forEach(expenseTypes, (expenseType) => {
    let categories = [];
    _.forEach(expenseType.categories, (category) => {
      let categoryObj = JSON.parse(category);
      categoryObj['requireURL'] = false;
      categoryObj = JSON.stringify(categoryObj);
      categories.push(categoryObj);
    });
    let params = {
      TableName: TABLE,
      Key: {
        id: expenseType.id
      },
      UpdateExpression: 'set categories = :a',
      ExpressionAttributeValues: {
        ':a': categories
      },
      ReturnValues: 'UPDATED_NEW'
    };

    // update expense type
    ddb
      .send(new UpdateCommand(params))
      .then(() => console.log(`Updated expense type id ${expenseType.id}`))
      .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
  });
} // addRequireURLAttrToCategories

/**
 * =================================================
 * |                                               |
 * |             End runnable scripts              |
 * |                                               |
 * =================================================
 */

/**
 * Asks user for script to run until they choose a valid script
 *
 * @param n - length items in actions array
 * @return - the user input
 */
function chooseAction(n) {
  let prompt = `Select an action number [0-${n - 1}]`;

  let input;
  let valid = false;
  while (!valid) {
    input = readlineSync.question(`${prompt}: `);
    input = parseInt(input);
    valid = !isNaN(input) && input >= 0 && input < n;
    if (!valid) console.log(`${colors.RED}Invalid input.${colors.NC}\n`);
  }

  return input;
} // chooseAction

/**
 * Prompts the user and confirm action
 *
 * @param scriptNum - the script number that is being confirmed
 * @return boolean - if the action was confirmed
 */
function confirmAction(scriptNum, scriptDesc) {
  let input;
  let affirmatives = ['y', 'yes'];
  let rejectives = ['n', 'no'];

  // build and ask prompt
  let prompt = `\n${colors.YELLOW}Are you sure you want to `;
  prompt += `run script ${colors.BOLD}${scriptNum}${colors.NC}:\n  ${scriptDesc}? [y/n] `;
  if (scriptNum == 0) prompt = `${colors.YELLOW}Are you sure you want to ${colors.BOLD}cancel${colors.NC}? [y/n] `;

  // get user input from prompt
  input = readlineSync.question(prompt);
  input = input.toLowerCase();
  while (!affirmatives.includes(input) && !rejectives.includes(input)) {
    input = readlineSync.question(`${colors.RED}Invalid input.${colors.NC}\n\n${prompt}`);
    input = input.toLowerCase();
  }

  if (affirmatives.includes(input)) {
    return true;
  } else {
    console.log('Action Canceled');
    return false;
  }
} // confirmAction

/**
 * main - action selector
 */
async function main() {
  const actions = [
    {
      desc: 'Cancel',
      action: () => {}
    },
    {
      desc: "set all expense type's accessible by value to 'ALL'?",
      action: async () => {
        await accessibleByAll();
      }
    },
    {
      desc: 'Change expense type categories to JSON objects',
      action: async () => {
        await categoryFixer();
      }
    },
    {
      desc: 'Add alwaysOnFeed to DynamoDB table?',
      action: async () => {
        await addAlwaysOnFeed();
      }
    },
    {
      desc: 'Delete disableShowOnFeedToggle from Expense Type table?',
      action: async () => {
        await removeAttribute(' }disableShowOnFeedToggle');
      }
    },
    {
      desc: 'Add requireURL attribute to Expense Type categories?',
      action: async () => {
        await addRequireURLAttrToCategories();
      }
    },
    {
      desc: 'Change Expense Types accessibilities?',
      action: async () => {
        await convertExpenseTypeAccessibilities();
      }
    }
  ];

  // print all actions for user
  _.forEach(actions, (action, index) => {
    console.log(`${index}. ${action.desc}`);
  });

  // get user input and run specified script
  let scriptNum = chooseAction(actions.length);
  if (confirmAction(scriptNum, actions[scriptNum].desc)) {
    actions[scriptNum].action();
    console.log(`${colors.GREEN}\nDone!${colors.NC}`);
  }
} // main

main();
