/**
 * Allows you to build/run scripts to generate csv files. The goal is to be able
 * to do this on the fly for whatever data you need, just adding a function to build
 * the specific csv file you want.
 * Try to reuse existing functions, but when you need to make your own, try to make it
 * as modular/generic as possible for future use. This is the "quick and dirty" way to 
 * get a CSV without building the functionality into the Portal, but there's no reason
 * that devs can't have a nice way to do this :)
 * 
 * node ./js/Scripts/csvSripts.js dev
 * node ./js/Scripts/csvSripts.js test
 * node ./js/Scripts/csvSripts.js prod (must set aws credentials for prod as default)
 *
 * npm run csvScripts:dev
 * npm run csvScripts:prod
 * npm run csvScripts:test
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

// table names for use in connections
const TABLENAMES = {
  AUDITS: `${STAGE}-audits`, // NOT  tested
  BUDGETS: `${STAGE}-budgets`, // NOT  tested
  CONTRACTS: `${STAGE}-contracts`,
  EMPLOYEES: `${STAGE}-employees`,
  EMPLOYEESSENSITIVE: `${STAGE}-employees-sensitive`, // NOT  tested
  EXPENSETYPES: `${STAGE}-expense-types`, // NOT  tested
  EXPENSES: `${STAGE}-expenses`, // NOT  tested
  GIFTCARDS: `${STAGE}-gift-cards`, // NOT  tested
  JOBAPPLICATIONS: `${STAGE}-job-applications`, // NOT  tested
  PTOCASHOUTS: `${STAGE}-pto-cashouts`, // NOT  tested
  TAGS: `${STAGE}-tags`, // NOT  tested
  TRAININGURLS: `${STAGE}-training-urls` // NOT  tested
};
const TN = TABLENAMES; // shortcut for TABLENAMES

// imports
const _ = require('lodash');
const readlineSync = require('readline-sync');
const baseCsv = require('./csvUtils/baseCsv.js');
// const dateUtils = require('../dateUtils.js');

// set up AWS DynamoDB
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ apiVersion: '2012-08-10', region: 'us-east-1' }), {
  marshallOptions: { convertClassInstanceToMap: true }
});

// set up s3
// const { CopyObjectCommand, ListObjectsCommand, S3Client } = require('@aws-sdk/client-s3');

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
 * |           GENERIC HELPER FUNCTIONS            |
 * |                                               |
 * =================================================
 */

/**
 * Helper to check if account is a real user or something like the Info account
 * 
 * @param e - employee account object to check
 * @return if account is a real user
 */
function isRealUser(e) {
  let fakeAccountNumers = ['99999'];
  return !fakeAccountNumers.includes(`${e.employeeNumber}`);
}

/**
 * Helper to check if account is a real user or something like the Info account
 * 
 * @param e - employee account object to check
 * @return if account is a real user
 */
function isIntern(e) {
  return e.jobRole === 'Intern';
}

/**
 * Helper to check if account is:
 *  - Real (not Info account or similar)
 *  - Not an intern
 *  - Active full-time or part-time employee
 * 
 * @param e - employee account object to check
 * @return if account is a real user
 */
function isActiveEmployee(e) {
  return isRealUser(e) && !isIntern(e) && e.workStatus > 0;
}

/**
 * Helper to recursively get all entries in dynamodb table
 */
function getAllEntriesHelper(params, out = []) {
  return new Promise((resolve, reject) => {
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
}
/**
 * Get all entries in dynamodb table
 *
 * @return - all the entries in the table
 */
function getAllEntries(table) {
  console.log(`Getting all entries in dynamodb ${table}`);
  let params = {
    TableName: table
  };
  console.log('Finished getting all entries');
  return getAllEntriesHelper(params);
} // getAllEntries

/**
 * Helper to download object or array of objects as CSV
 */
function download(data, filename = null) {
  // generate filestring
  let filestring;
  if (!Array.isArray(data[0])) filestring = baseCsv.generate(data);
  else filestring = baseCsv.generateFrom2dArray(data);

  // download
  baseCsv.download(filestring, filename);
}

/**
 * =================================================
 * |                                               |
 * |         END GENERIC HELPER FUNCTIONS          |
 * |                                               |
 * =================================================
 */

/**
 * =================================================
 * |                                               |
 * |            BEGIN EMPLOYEE SCRIPTS             |
 * |                                               |
 * =================================================
 */

/**
 * Gets customer org info for each employee:
 *  - Employee full name
 *  - Contract name
 *  - Prime name of contract employee is on
 *  - Customer org
 * 
 * @return employee org information as CSV-able object
 */
async function downloadCustomerOrgInfo() {
  // get employees and contracts
  let employees = await getAllEntries(TN.EMPLOYEES);
  let contracts = await getAllEntries(TN.CONTRACTS);

  // loop employees
  let employeeInfo = [];
  let info, org, orgs, cts, primes, c, contract;
  for (let e of employees) {
    // exclude inactive employees and interns
    if (!isActiveEmployee(e)) continue;

    // empty info
    info = {
      'Employee Number': '',
      'Employee Name': '',
      'Contracts': '',
      'Primes': '',
      'Customer Orgs': ''
    };
    let me = e.employeeNumber == '10079';
    
    // get employee number
    info['Employee Number'] = e.employeeNumber;

    // build employee's name
    info['Employee Name'] = `${e.lastName}, ${e.firstName}`;
    if (e.middleName) info['Employee Name'] += ` ${e.middleName}`;
    if (e.nickname) info['Employee Name'] += ` (${e.nickname})`;
    
    // get current org(s)
    orgs = []; // orgs
    if (e.customerOrgExp) {
      for (org of e.customerOrgExp) {
        // skip if not current
        if (!org.current) continue;
        // push to array
        orgs.push(org.name);
      }
      // concat orgs together
      info['Customer Orgs'] = orgs.join(' & ');
    } else {
      info['Customer Orgs'] = '';
    }

    // get current contract(s)
    cts = []; // contracts
    primes = []; // primes
    if (e.contracts) {
      for (c of e.contracts) {
        // skip if not current
        let hasCurrentProject = _.find(c.projects, (p) => !p.endDate);
        if (!c.current && !hasCurrentProject) {
          if (me) {
            console.log('-------------------------------------------------------');
            console.log(JSON.stringify(c));
            console.log('-------------------------------------------------------');
          }
          continue;
        }
        // get contract info from db var
        contract = contracts.find((item) => item.id === c.contractId);
        if (contract) {
          // get contract name
          cts.push(contract.contractName);
          // get prime name
          primes.push(contract.primeName);
        }
      }
      // concat together and set
      info['Contracts'] = cts.join(' & ');
      info['Primes'] = primes.join(' & ');
    } else {
      info['Contracts'] = '';
      info['Primes'] = '';
    }

    // add to employeeInfo
    employeeInfo.push(info);
  }

  // sort & download
  employeeInfo = baseCsv.sort(employeeInfo, ['Employee Name']);
  download(employeeInfo);
}

/**
 * =================================================
 * |                                               |
 * |             END EMPLOYEE SCRIPTS              |
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
  prompt += `run ${colors.BOLD}script ${scriptNum}${colors.NC}:\n  ${scriptDesc}? [y/n] `;
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
 * main - script selector and runner
 */
async function main() {
  // array of scripts the user can run
  const actions = [
    { desc: 'Cancel', action: () => { } },
    {
      desc: 'Download Customer Org Info',
      action: async () => {
        await downloadCustomerOrgInfo();
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
    await actions[scriptNum].action();
    console.log(`${colors.GREEN}\nDone!${colors.NC}`);
  }
}

// entry function
main();