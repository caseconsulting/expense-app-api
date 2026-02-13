/**
 * node ./scripts/migrations/expenseTypesScripts.js dev
 * node ./scripts/migrations/expenseTypesScripts.js test
 * node ./scripts/migrations/expenseTypesScripts.js prod (must set aws credentials for prod as default)
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
const TABLE = `${STAGE}-access-groups`;

// imports
const _ = require('lodash');
const readlineSync = require('readline-sync');

// set up  AWS DynamoDB
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ apiVersion: '2012-08-10', region: 'us-east-1' }), {
  marshallOptions: { convertClassInstanceToMap: true }
});

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
 * The Portal's very own deep copy of objects. No more lodash.
 * 
 * @param object - object to copy
 * @return copied object, with no references to the original
 */
function deepClone(object) {
  try { return structuredClone(object); }
  catch { return JSON.parse(JSON.stringify(object)); }
}

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
 * Renames the columns of the table
 */
async function renameColumns(from, to) {
  let databaseModify = new DatabaseModify(EMPLOYEES_TABLE);
  let rules = await getAllEntries();

  let f, t;
  let changes = [];
  for (let rule of rules) {
    for (let i in from) {
      f = from[i];
      t = to[i];
      rule[t] = deepClone(rule[f]);
      delete rule[f];
    }
    changes.push(databaseModify.updateEntryInDB(rule));
  }

  await Promise.all(changes);
}

/**
 * Renames the columns of the table
 */
async function assignmentNameUpdate() {
  let databaseModify = new DatabaseModify(EMPLOYEES_TABLE);
  let rules = await getAllEntries();

  let changes = [];
  for (let rule of rules) {
    for (let assignment of rule.assignments) {
      assignment['party'] = deepClone(assignment.users);
      assignment['for'] = deepClone(assignment.members);
    }
    changes.push(databaseModify.updateEntryInDB(rule));
  }

  await Promise.all(changes);
}

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
      desc: '',
      action: async () => {
        await renameColumns([], []);
      }
    },
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
