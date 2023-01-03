/**
 * node ./js/Scripts/contractScripts.js dev
 * node ./js/Scripts/contractScripts.js test
 * node ./js/Scripts/contractScripts.js prod (must set aws credentials for prod as default)
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

// set tables
const CONTRACT_TABLE = `${STAGE}-contracts`;
const EMPLOYEES_TABLE = `${STAGE}-employees`;

// imports
const _ = require('lodash');
const readlineSync = require('readline-sync');
const { v4: uuid } = require('uuid');

// set up  AWS DynamoDB
const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

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
 * gets all entries in the table
 *
 * @return - all the entries
 */
function getAllEntries() {
  console.log('Getting all entries in dynamodb employees table');
  let params = {
    TableName: EMPLOYEES_TABLE
  };
  let entries = getAllEntriesHelper(params);
  console.log('Finished getting all entries');
  return entries;
} // getAllEntries

function addContractsToTable(contracts) {
  _.forEach(contracts, (contract) => {
    let params = {
      TableName: CONTRACT_TABLE,
      Item: contract
    };

    // update expense type
    ddb.put(params, function (err) {
      if (err) {
        // item already exists
        console.error('Unable to create item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        console.log(
          `Created contract ${contract.contractName} with prime ${contract.primeName} and projects ${contract.projects}`
        );
      }
    });
  });
}

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
async function addContracts() {
  let employees = await getAllEntries();
  let contracts = [];
  _.forEach(employees, (employee) => {
    _.forEach(employee.contracts, (contract) => {
      _.forEach(contract.primes, (prime) => {
        let idx = contracts.findIndex((c) => {
          return contract.name === c.contractName && prime === c.primeName;
        });
        if (idx === -1) {
          // contract+prime combo does not exist
          let newContract = {
            id: uuid(),
            contractName: contract.name,
            primeName: prime,
            projects: contract.projects.map((project) => ({ projectName: project.name })),
            popStartDate: null,
            popEndDate: null,
            costType: null
          };
          contracts.push(newContract);
        } else {
          // contract+prime combo exists
          let projects = contract.projects.map((project) => ({ projectName: project.name }));
          contracts[idx].projects.push(...projects);
          // filter out duplicate projects
          contracts[idx].projects = contracts[idx].projects.filter((project, index, self) => {
            return index === self.findIndex((p) => p.projectName === project.projectName);
          });
        }
      });
    });
  });
  addContractsToTable(contracts);
} // addContractsToTable

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
      desc: 'Add contracts to the contract table from employee contract data?',
      action: async () => {
        await addContracts();
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
