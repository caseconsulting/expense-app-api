/**
 * node ./js/Scripts/budgetScripts.js dev
 * node ./js/Scripts/budgetScripts.js test
 * node ./js/Scripts/budgetScripts.js prod (must set aws credentials for prod as default)
 */

const ISOFORMAT = 'YYYY-MM-DD';
const dateUtils = require('../dateUtils');
const { v4: uuid } = require('uuid');
// const Budget = require('../../models/budget');
const fs = require('fs');
const ExpenseRoutes = require('../../routes/expenseRoutes');

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

// set budgets table
const TABLE = `${STAGE}-budgets`;

// sets expense attachments s3 bucket
let prodFormat = STAGE == 'prod' ? 'consulting-' : '';
const BUCKET = `case-${prodFormat}expense-app-attachments-${STAGE}`;

// imports
const _ = require('lodash');
const readlineSync = require('readline-sync');

// set up AWS DynamoDB
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
 * get all entries in dynamodb table
 *
 * @return - the entries in the table
 */
function getAllEntries() {
  console.log('Getting all entries in dynamodb budgets table');
  let params = {
    TableName: TABLE
  };
  let entries = getAllEntriesHelper(params);
  console.log('Finished getting all entries');
  return entries;
} // getAllEntries

/**
 * check to see if employee has access to the expenseType
 *
 * @param employee - the employee
 * @param expenseType - the expenseType
 * @return boolean - has access
 */
function hasAccess(employee, expenseType) {
  if (expenseType.accessibleBy == 'ALL' || expenseType.accessibleBy == 'FULL') {
    return true;
  } else if (expenseType.accessibleBy == 'FULL TIME') {
    return employee.workStatus == 100;
  } else {
    return expenseType.accessibleBy.includes(employee.id);
  }
} // hasAccess

/**
 * Get all expense types
 *
 * @return - all the employees
 */
async function getAllExpenseTypes() {
  let param = {
    TableName: `${STAGE}-expense-types`
  };
  return getAllEntriesHelper(param);
} // getAllExpenseTypes

const expenseTypes = getAllExpenseTypes();

/**
 * gets the expenseType object for a specific expenseType id
 *
 * @param expenseTypeId - the id of the expenseType
 * @return - the expenseType
 */
async function getExpenseType(expenseTypeId) {
  return _.find(await expenseTypes, ['id', expenseTypeId]);
} // getExpenseType

/**
 * Get all employees
 *
 * @return - all the employees
 */
async function getAllEmployees() {
  let param = {
    TableName: `${STAGE}-employees`
  };
  return getAllEntriesHelper(param);
} // getAllEmployees

const employees = getAllEmployees();

/**
 * gets the employee object for a specific employee id
 *
 * @param employeeId - the id of the employee
 * @return - the employee
 */
async function getEmployee(employeeId) {
  return _.find(await employees, ['id', employeeId]);
} // getEmployee

/**
 * Gets all expenses
 *
 * @return - all the expenses
 */
async function getAllExpenses() {
  let param = {
    TableName: `${STAGE}-expenses`
  };
  return getAllEntriesHelper(param);
} // getAllExpenses

const expenses = getAllExpenses();

/**
 * calulates the adjusted budget based on accessability TODO: Fix or mark as deprecated?
 *
 * @param budget - the budget
 * @return - adjusted budget
 */
async function calculateAdjustedBudget(budget) {
  let expenseType = await getExpenseType(budget.expenseTypeId);
  let employee = await getEmployee(budget.employeeId);
  if (expenseType && employee && hasAccess(employee, expenseType)) {
    if (expenseType.accessibleBy == 'FULL' || expenseType.accessibleBy == 'FULL TIME') {
      return expenseType.budget;
    } else {
      return Number((expenseType.budget * (employee.workStatus / 100.0)).toFixed(2));
    }
  } else {
    return 0;
  }
} // calculateAdjustedBudget

/**
 * Removes given attribute from all budget data
 *
 * @param attribute - the given attribute to remove
 */
async function removeAttribute(attribute) {
  let budgets = await getAllEntries();
  _.forEach(budgets, (budget) => {
    let params = {
      TableName: TABLE,
      Key: {
        id: budget.id
      },
      UpdateExpression: `remove ${attribute}`,
      ReturnValues: 'UPDATED_NEW'
    };

    // update budget
    ddb.update(params, function (err) {
      if (err) {
        console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      }
    });
  });
} // removeAttribute

/**
 * Copies values from old attribute name to new attribute name
 *
 * @param oldName - the old attribute's name
 * @param newName - the new attribute's name
 */
async function copyValues(oldName, newName) {
  let budgets = await getAllEntries();

  _.forEach(budgets, (budget) => {
    let params = {
      TableName: TABLE,
      Key: {
        id: budget.id
      },
      UpdateExpression: `set ${newName} = :e`,
      ExpressionAttributeValues: {
        ':e': budget[oldName]
      },
      ReturnValues: 'UPDATED_NEW'
    };

    if (budget[newName]) {
      params.ExpressionAttributeValues = {
        ':e': budget[newName]
      };
    }

    // update budget
    ddb.update(params, function (err, data) {
      if (err) {
        console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        console.log(`Item Updated\n  Budget ID: ${budget.id}\n  ${newName} copied: ${data.Attributes[newName]}`);
      }
    });
  });
} // copyValues

/**
 * Checks if date is within date range given the start date and end date.
 * Returns true if date is within range and false otherwise.
 *
 * @param date date to check if within range
 * @param startDate start date of range
 * @param endDate end date of range
 * @returns true if date is within range, false otherwise
 */
function isDateInRange(dateStr, startDate, endDate) {
  let date = dateUtils.format(dateStr, null, ISOFORMAT);
  let start = dateUtils.format(startDate, null, ISOFORMAT);
  let end = dateUtils.format(endDate, null, ISOFORMAT);
  return dateUtils.isBetween(date, start, end, 'day', '[]');
} // isDateInRange

/**
 * Gets fiscal start and end dates for a budget.
 * @return object containing fiscal start and end dates
 */
function getBudgetDates(date) {
  let hireDate = dateUtils.format(date, ISOFORMAT);
  let hireYear = dateUtils.getYear(hireDate);
  let hireMonth = dateUtils.getMonth(hireDate) + 1;
  let hireDay = dateUtils.getDay(hireDate);
  let today = dateUtils.getTodaysDate();

  let startYear;
  if (dateUtils.isBefore(hireDate, today)) {
    let budgetDate = `${dateUtils.getYear(today)}-${hireMonth}-${hireDay}`;
    startYear = dateUtils.isBefore(today, budgetDate)
      ? dateUtils.setYear(today, parseInt(dateUtils.getYear(today)) + 1)
      : dateUtils.getYear(today);
  } else {
    startYear = hireYear;
  }

  let startDate = `${startYear}-${hireMonth}-${hireDay}`;
  let endDate = dateUtils.subtract(dateUtils.add(startDate, 1, 'year'), 1, 'day');

  let result = {
    startDate,
    endDate
  };
  return result;
} // getBudgetDates

/**
 * Generates and returns a new uuid.
 *
 * @return String - new uuid
 */
function getUUID() {
  return uuid();
} // getUUID

/**
 * upload tiny attachment to s3 for later
 * @param file - file to upload
 * @param key - where to upload it to
 */
async function uploadAttachmentToS3(file, key) {
  console.info('mifistatus uploadAttachmentToS3: attempting to upload file to key ' + key + ' of bucket: ' + BUCKET);
  let s3 = new AWS.S3();
  let params = {
    Bucket: BUCKET,
    Key: key,
    Body: file
  };

  s3.putObject(params, function (err, data) {
    if (err) console.info(err, err.stack);
    // an error occurred
    else console.info(data); // successful response
  });
} //uploadAttachmentToS3

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
 * Sets the amount of all budgets to 100% of its expense type
 */
async function maxAmount() {
  let budgets = await getAllEntries();
  _.forEach(budgets, async (budget) => {
    let amount = await calculateAdjustedBudget(budget);
    let params = {
      TableName: TABLE,
      Key: {
        id: budget.id
      },
      UpdateExpression: 'set amount = :a',
      ExpressionAttributeValues: {
        ':a': amount
      },
      ReturnValues: 'UPDATED_NEW'
    };

    // update employee
    ddb.update(params, function (err, data) {
      if (err) {
        console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        console.log(`Item Updated\n  Budget ID: ${budget.id}\n  Amount: ${data.Attributes['amount']}`);
      }
    });
  });
} // maxAmount

/**
 * Deletes all budgets that have no pending or reimbursed amounts.
 */
async function deleteEmptyBudgets() {
  let budgets = await getAllEntries();
  _.forEach(budgets, async (budget) => {
    if (budget.reimbursedAmount + budget.pendingAmount == 0) {
      let params = {
        TableName: TABLE,
        Key: {
          id: budget.id
        }
      };

      // update employee
      ddb.delete(params, function (err) {
        if (err) {
          console.error('Unable to delete an item. Error JSON:', JSON.stringify(err, null, 2));
        } else {
          console.log(`Deleted Budget ${budget.id}`);
        }
      });
    }
  });
} // deleteEmptyBudgets

/**
 * Changes attribute name
 *
 * @param oldName - the old attribute name
 * @param newName - the new attribute name
 */
async function changeAttributeName(oldName, newName) {
  copyValues(oldName, newName);
  removeAttribute(oldName);
} // changeAttributeName

/**
 * Adusts tech budget based on MiFi status. If MiFi status is set
 * to false and additional $150 was not added to tech budget during
 * current year then add $150 to tech budget amount.
 */
async function adjustTechBudgetMiFiStatus() {
  const expenseRoutes = new ExpenseRoutes();
  let techExpenseType = (await expenseTypes).find((e) => e.budgetName === 'Technology');
  let fullTimeEmployees = (await employees).filter((e) => e.workStatus == 100 && !e.mifiStatus);
  let now = dateUtils.getTodaysDate();
  let fileName = 'MifiStatusChange.png';
  let receiptFile = fs.readFileSync('~/../mifiStatus/resources/' + fileName);
  let adjustedTechBudgetEmployees = [];
  await asyncForEach(fullTimeEmployees, async (employee) => {
    let employeeExpenses = (await expenses).filter((e) => e.employeeId == employee.id);
    let techBudgetDates = getBudgetDates(employee.hireDate);
    let mifiExpenses = employeeExpenses.filter(
      (e) => e.receipt === fileName && isDateInRange(e.createdAt, techBudgetDates.startDate, techBudgetDates.endDate)
    );
    let mifiExpensesSum = mifiExpenses.map((e) => e.cost).reduce((num1, num2) => num1 + num2, 0);
    if (mifiExpensesSum == 0) {
      let newUUID = getUUID();
      let description = `${employee.firstName} ${employee.lastName} has indicated that they no longer
       want the mifi benefit.`;
      let expense = {
        id: newUUID,
        employeeId: employee.id,
        createdAt: now,
        expenseTypeId: techExpenseType.id,
        cost: -150,
        description: description,
        purchaseDate: now,
        showOnFeed: false,
        receipt: fileName,
        canDelete: false
      };
      let Key = employee.id + '/' + newUUID + '/' + fileName;
      try {
        let preparedExpense = await expenseRoutes._create(expense);
        let validatedExpense = await expenseRoutes._validateInputs(preparedExpense);
        await expenseRoutes.databaseModify.addToDB(validatedExpense); // add object to database
        await uploadAttachmentToS3(receiptFile, Key);
        adjustedTechBudgetEmployees.push(employee);
      } catch (err) {
        console.info(err);
        console.info(err.stack);
      }
    }
  });
  console.log(adjustedTechBudgetEmployees);
  adjustedTechBudgetEmployees.forEach((e) => {
    console.log(`${e.firstName} ${e.lastName}'s tech budget has been adjusted due to MiFi status bug.`);
  });
} // adjustTechBudgetMifiStatus

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
    { desc: 'Cancel', action: () => {} },
    {
      desc: 'Set the amount of all budgets based on employee work status and expense type?',
      action: async () => {
        await maxAmount();
      }
    },

    {
      desc: 'Change all budget attributes labeled userId to employeeId?',
      action: async () => {
        await changeAttributeName('userId', 'employeeId');
      }
    },

    {
      desc: 'Delete all empty budgets without any pending or reimbursed amounts?',
      action: async () => {
        await deleteEmptyBudgets();
      }
    },

    {
      desc: 'Adjust technology budget in response to MiFi status bug?',
      action: async () => {
        await adjustTechBudgetMiFiStatus();
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
