/**
 * node ./js/Scripts/expensesScripts.js dev
 * node ./js/Scripts/expensesScripts.js test
 * node ./js/Scripts/expensesScripts.js prod (must set aws credentials for prod as default)
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

// set expense table
const TABLE = `${STAGE}-expenses`;
const ETTABLE = `${STAGE}-expense-types`;
const BUDGETS_TABLE = `${STAGE}-budgets`;
const EMPLOYEES_TABLE = `${STAGE}-employees`;

// imports
import { generateUUID } from '../utils.js';
import _ from 'lodash';
import readlineSync from 'readline-sync';

// set up AWS DynamoDB
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
  PutCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ apiVersion: '2012-08-10', region: 'us-east-1' }), {
  marshallOptions: { convertClassInstanceToMap: true }
});

export const EXPENSE_STATES = {
  CREATED: 'CREATED',
  APPROVED: 'APPROVED',
  REIMBURSED: 'REIMBURSED',
  REJECTED: 'REJECTED',
  RETURNED: 'RETURNED',
  REVISED: 'REVISED'
};

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
 * gets the number of expenses to create from the user
 *
 * @return - user's decision
 */
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
} // getNumExpenses

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
 * get all entries in dynamodb table
 *
 * @param table - the dynamo table
 * @return - all the entries
 */
function getAllEntries(table) {
  console.log(`Getting all entries in dynamodb ${table} table`);
  let params = {
    TableName: table
  };
  let entries = getAllEntriesHelper(params);
  console.log('Finished getting all entries in ' + table);
  return entries;
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
 * adds a showOnFeed attribute to each expense in DynamoDB
 */
async function addShowOnFeed() {
  // check expenseType, then check categories, then set to false
  let expenseTypes = await getAllEntries(ETTABLE);
  let expenses = await getAllEntries(TABLE);
  _.forEach(expenses, (expense) => {
    let expenseType = _.find(expenseTypes, (eType) => {
      return eType.id === expense.expenseTypeId;
    });
    let category;
    if (expenseType.categories) {
      category = _.find(expenseType.categories, (cat) => {
        return JSON.parse(cat).name == expense.category;
      });
    }
    let sof = false;
    if (category) {
      category = JSON.parse(category);
      sof = category.showOnFeed;
    } else {
      sof = expenseType.alwaysOnFeed;
    }
    let params = {
      TableName: TABLE,
      Key: {
        id: expense.id
      },
      UpdateExpression: 'set showOnFeed = :a',
      ExpressionAttributeValues: {
        ':a': sof
      },
      ReturnValues: 'UPDATED_NEW'
    };

    // update expense
    ddb
      .send(new UpdateCommand(params))
      .then()
      .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
  });
} // addShowOnFeed

/**
 * Adds receipts to all expenses that should have one, but don't for some reason.
 * Most likely because they were created before the receipt requirement was in place.
 */
async function addReceipts() {
  // check expenseType, then check categories, then set to false
  let expenseTypes = await getAllEntries(ETTABLE);
  let expenses = await getAllEntries(TABLE);
  _.forEach(expenses, (expense) => {
    let expenseType = _.find(expenseTypes, (eType) => {
      return eType.id === expense.expenseTypeId;
    });
    // if receipt required and no receipt
    if (expenseType.requiredFlag && expense.receipt === undefined) {
      console.log(`Updating expense ${expense.id}`);
      // add "receipt" url
      let params = {
        TableName: TABLE,
        Key: {
          id: expense.id
        },
        UpdateExpression: 'set receipt = :a',
        ExpressionAttributeValues: {
          ':a': 'doNotOpenNonExistant.png'
        },
        ReturnValues: 'UPDATED_NEW'
      };
      // update expense
      ddb
        .send(new UpdateCommand(params))
        .then.catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
    }
  });
} // addReceipts

/**
 * Used for testing dynamo limitations - populates data table with expenses
 *
 * @param numberOfItems - number of expenses to populate
 */
function createItems(numberOfItems) {
  for (let i = 0; i < numberOfItems; i++) {
    let newId = generateUUID();
    let params = {
      TableName: TABLE,
      Item: {
        id: newId,
        category: 'test category',
        cost: 1,
        createdAt: '2020-03-23',
        description: 'test description',
        expenseTypeId: '891ed076-65fd-4810-8988-e30e770c7c95', // technology
        note: 'test note',
        purchaseDate: '2020-03-23',
        receipt: 'testReceipt.jpeg',
        reimbursedDate: '2020-03-23',
        url: 'https://testUrl.com',
        employeeId: 'c722279e-2e11-43bb-a1d2-4999e8a98a6c' // info account
      }
    };
    ddb
      .send(new PutCommand(params))
      .then(() => console.log(`Created dummy expense with id: ${newId}`))
      .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
  }
} // createItems

/**
 * Used for testing dynamo limitations - deletes all expenses
 */
async function deleteAllExpenses() {
  let expenses = await getAllEntries(TABLE);
  _.forEach(expenses, (expense) => {
    let params = {
      TableName: TABLE,
      Key: {
        id: expense.id
      }
    };

    ddb
      .send(new DeleteCommand(params))
      .then()
      .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
  });
} // deleteAllExpenses

/**
 * Copies values from old attribute name to new attribute name
 *
 * @param oldName - the old attribute name
 * @param newName - the new attribute name
 */
async function copyValues(oldName, newName) {
  let expenses = await getAllEntries(TABLE);

  _.forEach(expenses, (expense) => {
    let params = {
      TableName: TABLE,
      Key: {
        id: expense.id
      },
      UpdateExpression: `set ${newName} = :e`,
      ExpressionAttributeValues: {
        ':e': expense[oldName]
      },
      ReturnValues: 'UPDATED_NEW'
    };

    if (expense[newName]) {
      params.ExpressionAttributeValues = {
        ':e': expense[newName]
      };
    }

    // update expense
    ddb
      .send(new UpdateCommand(params))
      .then((data) =>
        console.log(`Item Updated\n  Expense ID: ${expense.id}\n  ${newName} copied: ${data.Attributes[newName]}`)
      )
      .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
  });
} // copyValues

/**
 * Removes given attribute from all expense data
 *
 * @param attribute - attribute to be removed
 */
async function removeAttribute(attribute) {
  let expenses = await getAllEntries(TABLE);
  _.forEach(expenses, (expense) => {
    let params = {
      TableName: TABLE,
      Key: {
        id: expense.id
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
 * Deletes pending mifi expenses
 */
async function deletePendingMifi() {
  let expenses = await getAllEntries(TABLE);
  const dateUtils = await import('../dateUtils');
  const ExpenseRoutes = await import('../../routes/expenseRoutes');
  const expenseRoutes = new ExpenseRoutes();

  await _.forEach(expenses, async (expense) => {
    // if expense is a MiFi reimbursement and is pending
    let expenseIsMifi = expense.cost === -150 && expense.receipt === 'MifiStatusChange.png';
    let expenseIsPending = expense.reimbursedDate === undefined;
    if (expenseIsMifi && expenseIsPending) {
      // fetch employees tech budget on this expense
      let budgets = await getAllEntries(BUDGETS_TABLE);
      let budget = _.filter(budgets, { 'expenseTypeId': expense.expenseTypeId, 'employeeId': expense.employeeId });
      
      // if budget year is in the past year (aka MiFi reimbursement is in this year's budget)
      let expenseTypeInBudgetYear = _.filter(budget, (b) => { return b.fiscalEndDate > dateUtils.getTodaysDate(); });
      expenseTypeInBudgetYear = expenseTypeInBudgetYear.length > 0;
      if (expenseTypeInBudgetYear) {
        // delete expense and update budget (expense routes handles both)
        let deletable = await expenseRoutes._delete(expense.id);
        await expenseRoutes.databaseModify.removeFromDB(deletable.id);
      }
    }
  });
} // deletePendingMifi

async function updateReimburseForMifi() {
  let expenses = await getAllEntries(TABLE);
  const dateUtils = await import('../dateUtils');

  _.forEach(expenses, async (expense) => {
    let expenseIsMifi = expense.cost === -150 && expense.receipt === 'MifiStatusChange.png';
    let expenseIsPending = expense.reimbursedDate === undefined;
    if (expenseIsMifi && !expenseIsPending) {
      // add to reimburse amount if expense is not pending
      let budgets = await getAllEntries(BUDGETS_TABLE);
      let budget = _.filter(budgets, { 'expenseTypeId': expense.expenseTypeId, 'employeeId': expense.employeeId });
      budget = _.filter(budget, (b) => { return b.fiscalEndDate > dateUtils.getTodaysDate(); });
      if (budget.length > 0) {
        budget = budget[0];
        let reimbursedAmount = budget.reimbursedAmount + 150; // ✨magic number✨ is MiFi reimburse amount
        let oldAmount = budget.reimbursedAmount; // for logging
        let params = {
          TableName: BUDGETS_TABLE,
          Key: {
            id: budget.id
          },
          UpdateExpression: 'set reimbursedAmount = :a',
          ExpressionAttributeValues: {
            ':a': reimbursedAmount
          },
          ReturnValues: 'UPDATED_NEW'
        };
        await ddb
          .send(new UpdateCommand(params))
          .then((data) => console.log(
            `Item Updated\n  Budget ID: ${budget.id}\n  Amount: ${
              data.Attributes['reimbursedAmount']} (was ${oldAmount})`))
          .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
      }
    }
  });
} // updateReimburseForMifi

async function updateAllStates() {
  let expenses = await getAllEntries(TABLE);
  let employees = await getAllEntries(EMPLOYEES_TABLE);
  let { CREATED, APPROVED, REIMBURSED, REJECTED, RETURNED, REVISED } = EXPENSE_STATES;

  // helper to decide if an expense is approved
  let signers = {
    cv: { email: 'cvincent@consultwithcase.com' },
    ab: { email: 'abendele@consultwithcase.com' },
    kc: { email: 'kchernyak@consultwithcase.com' }
  };

  // fill in IDs of signers
  for (let s of Object.values(signers)) {
    let emp = employees.find((e) => e.email === s.email);
    s.id = emp?.id ?? null;
  }

  // helper to check who approved
  function isApproved(expense) {
    let note = expense.note?.toLowerCase() ?? '';
    // unapproved if there's no 'approved' message
    if (!note.includes('approved')) return false;
    // double-check if there's a signature from someone
    for (let [key, val] of Object.entries(signers)) if (note.includes(key)) return val.id;
    // return false if no signature was matched
    return false;
  }

  let state, params;
  let n = 1;
  for (let expense of expenses) {
    // decide which state expense is in
    let approver = isApproved(expense);
    if (expense.reimbursedDate) state = REIMBURSED;
    else if (expense.rejections?.hardRejections) state = REJECTED;
    else if (expense.rejections?.softRejections?.revised) state = REVISED;
    else if (expense.rejections?.softRejections) state = RETURNED;
    else if (approver) state = APPROVED; 
    else state = CREATED;

    // update the state in DDB
    params = {
      TableName: TABLE,
      Key: { id: expense.id },
      UpdateExpression: 'set #st = :s',
      ExpressionAttributeNames: { '#st': 'state' },
      ExpressionAttributeValues: { ':s': state },
      ReturnValues: 'UPDATED_NEW'
    };

    // get approved by if applicable
    if (state === APPROVED) {
      let approvedBy = employees.find((e) => e.id === approver);
      params.UpdateExpression += ', #ab = :a';
      params.ExpressionAttributeNames['#ab'] = 'approvedBy';
      params.ExpressionAttributeValues[':a'] = approvedBy?.id ?? '';
    }

    // update expense
    await ddb
      .send(new UpdateCommand(params))
      .then(console.log(`(${n++}/${expenses.length}) Updated expense ${expense.id} to state ${state}`))
      .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
  }
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
    { desc: 'Cancel', action: () => {} },
    {
      desc: 'List all expenses?',
      action: async () => {
        console.log(await getAllEntries(TABLE));
      }
    },
    {
      desc: 'Creating dummy expenses',
      action: async () => {
        let numExpenses = getNumExpenses();
        await createItems(numExpenses);
      }
    },

    {
      desc: 'Deleting all expenses',
      action: async () => {
        await deleteAllExpenses();
      }
    },

    {
      desc: 'Changing all expense attributes labeled categories to category',
      action: async () => {
        await changeAttributeName('categories', 'category');
      }
    },

    {
      desc: 'Changing all expense attributes labeled userId to employeeId',
      action: async () => {
        await changeAttributeName('userId', 'employeeId');
      }
    },

    {
      desc: 'Adding showOnFeed attribute to all expenses',
      action: async () => {
        await addShowOnFeed();
      }
    },

    {
      desc: 'Adding receipts to legacy expenses of types that now require receipt',
      action: async () => {
        await addReceipts();
      }
    },

    {
      desc: 'Delete pending MiFi expenses',
      action: async () => {
        await deletePendingMifi();
      }
    },

    {
      desc: 'Update reimburse amounts for reimbursed MiFi expenses',
      action: async () => {
        await updateReimburseForMifi();
      }
    },

    {
      desc: 'Set each expense state based on expense data',
      action: async () => {
        await updateAllStates();
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
