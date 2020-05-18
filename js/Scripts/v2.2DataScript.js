/*
 * node ./js/Scripts/v2.2DataScript.js dev
 * node ./js/Scripts/v2.2DataScript.js test
 * node ./js/Scripts/v2.2DataScript.js prod --profile prod
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

const _ = require('lodash');
const moment = require('moment');
const readlineSync = require('readline-sync');

const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

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

// get all entries in dynamodb table
function getAllEntries(table) {
  console.log(`Getting all entries from dynamodb ${table} table`);
  let params = {
    TableName: table
  };
  let entries = getAllEntriesHelper(params);
  console.log(`Finished getting all entries from ${table}`);
  return entries;
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
 * Deletes all budgets that have no pending or reimbursed amounts.
 */
async function deleteEmptyBudgets() {
  console.log('Deleting empty budgets');

  let budgets = await getAllEntries(BUDGETS_TABLE);

  await asyncForEach(budgets, async (budget) => {
    if (budget.reimbursedAmount + budget.pendingAmount == 0) {
      let params = {
        TableName: BUDGETS_TABLE,
        Key: {
          id: budget.id
        },
        ReturnValues: 'ALL_OLD'
      };

      // delete budget
      await ddb.delete(params)
        .promise()
        .then(data => {
          console.log(`Successfully deleted budget ${data.Attributes.id}`);
        })
        .catch(err => {
          console.error(`Failed to delete budget ${budget.id}. Error JSON:`, JSON.stringify(err, null, 2));
        });
    }
  });

  console.log('Finished Deleting empty budgets');
} // deleteEmptyBudgets

/**
 * Copies values from old attribute name to new attribute name in given table
 */
async function copyValues(table, oldName, newName) {
  console.log(`Copying values from ${oldName} to ${newName} in table ${table}`);

  let entries = await getAllEntries(table);

  await asyncForEach(entries, async (entry) => {
    let params = {
      TableName: table,
      Key: {
        id: entry.id
      },
      UpdateExpression: `set ${newName} = :e`,
      ExpressionAttributeValues: {
        ':e': entry[oldName]
      },
      ReturnValues: 'ALL_NEW'
    };

    if (entry[newName]) {
      params.ExpressionAttributeValues = {
        ':e': entry[newName]
      };
    }

    // update entry
    await ddb.update(params)
      .promise()
      .then(data => {
        console.log(`Successfully copied value from ${oldName} to ${newName} in table ${table}`,
          `for entry ${data.Attributes.id}. Value: ${data.Attributes[newName]}`
        );
      })
      .catch(err => {
        console.error(`Failed to copy value from ${oldName} to ${newName} in table ${table} for entry ${entry.id}.`,
          'Error JSON:', JSON.stringify(err, null, 2)
        );
      });
  });

  console.log(`Finished copying values from ${oldName} to ${newName} in table ${table}`);
} // copyValues

/**
 * Removes given attribute from table provided
 */
async function removeAttribute(table, attribute) {
  console.log(`Removing attributes ${attribute} from table ${table}`);

  let entries = await getAllEntries(table);

  await asyncForEach(entries, async (entry) => {
    let params = {
      TableName: table,
      Key: {
        id: entry.id
      },
      UpdateExpression: `remove ${attribute}`,
      ReturnValues: 'ALL_NEW'
    };

    // update entry
    await ddb.update(params)
      .promise()
      .then(data => {
        console.log(`Successfully removed attribute ${attribute} from table ${table} for entry ${data.Attributes.id}`);
      })
      .catch(err => {
        console.error(`Failed to remove attribute ${attribute} from table ${table} for entry ${entry.id}.`,
          'Error JSON:', JSON.stringify(err, null, 2)
        );
      });
  });

  console.log(`Finished removing attributes ${attribute} from table ${table}`);
} // removeAttribute

/**
 * Changes attribute name for a given table
 */
async function changeAttributeName(table, oldName, newName) {
  console.log(`Changing attribute name from ${oldName} to ${newName} in table ${table}`);

  await copyValues(table, oldName, newName);
  await removeAttribute(table, oldName);

  console.log(`Finished changing attribute name from ${oldName} to ${newName} in table ${table}`);
} // changeAttributeName


/**
 * Checks if an employee has access to an expense type
 */
function hasAccess(employee, expenseType) {
  console.log(`Checking if employee ${employee.id} has access to expense type ${expenseType.id}`);

  let result;

  if (employee.workStatus == 0) {
    result = false;
  } else if (expenseType.accessibleBy == 'ALL') {
    result = true;
  } else if (expenseType.accessibleBy == 'FULL TIME') {
    result = employee.workStatus == 100;
  } else if (expenseType.accessibleBy == 'PART TIME') {
    result = employee.workStatus > 0 && employee.workStatus < 100;
  } else {
    result = expenseType.accessibleBy.includes(employee.id);
  }

  if (result) {
    console.log(`Employee ${employee.id} has access to ${expenseType.id}`);
  } else {
    console.log(`Employee ${employee.id} does not have access to ${expenseType.id}`);
  }
  return result;
}

/**
 * Calculates the adjusted budget amount for an expense type based on an employee's work status. Returns the adjust
 * amount.
 */
function calcAdjustedAmount(employee, expenseType) {
  console.log(`Calculating adjusted budget amount for employee ${employee.id} and expense type ${expenseType.id}`);

  let result = Number((expenseType.budget * (employee.workStatus / 100.0)).toFixed(2));

  console.log(`Adjusted budget amount is $${result}`);
  return result;
} // calcAdjustedAmount

// /**
//  * Sets the amount of all budgets based on employee work status and expense type budget
//  */
// async function setBudgetAmounts() {
//   console.log('Setting budget amounts');
//
//   let budgets = await getAllEntries(BUDGETS_TABLE);
//   let employees = await getAllEntries(EMPLOYEES_TABLE);
//   let expenseTypes = await getAllEntries(EXPENSE_TYPES_TABLE);
//
//   await asyncForEach(budgets, async (budget) => {
//     let employee = _.find(employees, ['id', budget.employeeId]);
//     let expenseType = _.find(expenseTypes, ['id', budget.expenseTypeId]);
//     let amount;
//     if (hasAccess(employee, expenseType)) {
//       amount = calcAdjustedAmount(employee, expenseType);
//     } else {
//       amount = 0;
//     }
//
//     let params = {
//       TableName: BUDGETS_TABLE,
//       Key: {
//         'id': budget.id
//       },
//       UpdateExpression: 'set amount = :a',
//       ExpressionAttributeValues: {
//         ':a': amount
//       },
//       ReturnValues: 'ALL_NEW'
//     };
//
//     // update bugets
//     await ddb.update(params)
//       .promise()
//       .then(data => {
//         console.log(`Successfully set budget amount ${data.Attributes.amount} for budget ${budget.id}`);
//       })
//       .catch(err => {
//         console.log(`Failed to set budget amount for budget ${budget.id}`);
//       });
//   });
//
//   console.log('Finished setting budget amounts');
// } // setBudgetAmounts

/**
 * Sets the amount of all budgets to full expense type budget
 */
async function setBudgetAmounts() {
  console.log('Setting full budget amounts');

  let budgets = await getAllEntries(BUDGETS_TABLE);
  let expenseTypes = await getAllEntries(EXPENSE_TYPES_TABLE);
  let employees = await getAllEntries(EMPLOYEES_TABLE);

  await asyncForEach(budgets, async (budget) => {
    let expenseType = _.find(expenseTypes, ['id', budget.expenseTypeId]);
    let amount = expenseType.budget;

    let start = moment(budget.fiscalStartDate);
    let end = moment(budget.fiscalEndDate);
    if (moment().isBetween(start, end, undefined, '[]')) {
      let employee = _.find(employees, ['id', budget.employeeId]);
      if (hasAccess(employee, expenseType)) {
        amount = calcAdjustedAmount(employee, expenseType);
      } else {
        amount = 0;
      }
    }

    let params = {
      TableName: BUDGETS_TABLE,
      Key: {
        'id': budget.id
      },
      UpdateExpression: 'set amount = :a',
      ExpressionAttributeValues: {
        ':a': amount
      },
      ReturnValues: 'ALL_NEW'
    };

    // update bugets
    await ddb.update(params)
      .promise()
      .then(data => {
        console.log(`Successfully set budget amount ${data.Attributes.amount} for budget ${budget.id}`);
      })
      .catch(err => {
        console.error(`Failed to set budget amount for budget ${budget.id}.`,
          'Error JSON:', JSON.stringify(err, null, 2)
        );
      });
  });

  console.log('Finished setting full budget amounts');
} // setBudgetAmounts

/**
 * Set employee work status. If isInactive is true, workstatus = 0. If isInactive is false, workStatus = 100.
 */
async function setWorkStatus() {
  console.log('Setting all employee work status to 100 if active or 0 if inactive');

  let employees = await getAllEntries(EMPLOYEES_TABLE);

  await asyncForEach(employees, async (employee) => {
    if (employee.isInactive != null) {
      let params = {
        TableName: EMPLOYEES_TABLE,
        Key: {
          'id': employee.id
        },
        UpdateExpression: 'set workStatus = :ws',
        ExpressionAttributeValues: {
          ':ws': 100
        },
        ReturnValues: 'ALL_NEW'
      };

      if (employee.isInactive) {
        params.ExpressionAttributeValues = {
          ':ws': 0
        };
      }

      await ddb.update(params)
        .promise()
        .then(data => {
          console.log(`Successfully set employee work status to ${data.Attributes.workStatus}`,
            `for employee ${employee.id}`
          );
        })
        .catch(err => {
          console.error(`Failed to set work status for employee ${employee.id}.`,
            'Error JSON:', JSON.stringify(err, null, 2)
          );
        });
    }
  });

  console.log('Finished setting all employee work status');
} // setWorkStatus

/**
 * Set expense type accessibleBy to 'ALL'
 */
async function setAccessibleBy() {
  console.log('Setting all expense types accessible by to ALL');

  let expenseTypes = await getAllEntries(EXPENSE_TYPES_TABLE);

  await asyncForEach(expenseTypes, async (expenseType) => {
    if (expenseType.accessibleBy == null) {
      let params = {
        TableName: EXPENSE_TYPES_TABLE,
        Key: {
          'id': expenseType.id
        },
        UpdateExpression: 'set accessibleBy = :a',
        ExpressionAttributeValues: {
          ':a': 'ALL'
        },
        ReturnValues: 'ALL_NEW'
      };

      await ddb.update(params)
        .promise()
        .then(data => {
          console.log(`Successfully set accessibleBy to ALL for expense type ${data.Attributes.id}`);
        })
        .catch(err => {
          console.error(`Failed to set accessibleBy to ALL for expense type ${expenseType.id}.`,
            'Error JSON:', JSON.stringify(err, null, 2)
          );
        });
    }
  });

  console.log('Finished setting all expense types accessible by to ALL');
} // setAccessibleBy

/**
 * Removed null receipt or null note fields from expenses
 */
async function removeNullExpenseReceiptAndNote() {
  console.log('Removing null receipt and note fields from expenses');

  let expenses = await getAllEntries(EXPENSES_TABLE);

  await asyncForEach(expenses, async (expense) => {
    if (expense.receipt == null || expense.note == null) {
      let params = {
        TableName: EXPENSES_TABLE,
        Key: {
          'id': expense.id
        },
        UpdateExpression: 'set receipt = :r, note = :n',
        ExpressionAttributeValues: {
          ':r': ' ',
          ':n': ' '
        },
        ReturnValues: 'ALL_NEW'
      };

      if (expense.receipt == null && expense.note != null) {
        params.ExpressionAttributeValues = {
          ':r': ' ',
          ':n': expense.note
        };
      } else if (expense.receipt != null && expense.note == null) {
        params.ExpressionAttributeValues = {
          ':r': expense.receipt,
          ':n': ' '
        };
      }

      await ddb.update(params)
        .promise()
        .then(data => {
          console.log(`Successfully removed null receipt or note from expense ${data.id}`);
        })
        .catch(err => {
          console.log(`Failed to remove null receipt or note from expense ${expense.id}.`,
            'Error JSON:', JSON.stringify(err, null, 2)
          );
        });
    }
  });

  console.log('Finished removing null receipt and note fields from expenses');
} // removeNullExpenseReceiptAndNote

async function main() {
  if (confirmAction('update expense app dynamodb data for v2.2?')) {
    await deleteEmptyBudgets(); // delete empty budgets
    // change budget userId attribute name to employeeId
    await changeAttributeName(BUDGETS_TABLE, 'userId', 'employeeId');
    await setWorkStatus(); // set employee work status to 100 or 0
    await setBudgetAmounts(); // set budget amounts based on employee and expense type
    await removeAttribute(EMPLOYEES_TABLE, 'isInactive'); // remove employee isInactive attribute
    await setAccessibleBy(); // set expense type accessible by to 'ALL'
    await changeAttributeName(EXPENSES_TABLE, 'categories', 'category'); // change expense categories name to category
    await changeAttributeName(EXPENSES_TABLE, 'userId', 'employeeId'); // change expense userId name to employeeId
    await removeNullExpenseReceiptAndNote(); // replace null expense receipt and note values with a space character
  } else {
    console.log('Canceled Update');
  }
} // main

main();
