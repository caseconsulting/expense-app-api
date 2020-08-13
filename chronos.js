const Budget = require('./models/budget');
const ExpenseType = require('./models/expenseType');
const DatabaseModify = require('./js/databaseModify');
const moment = require('moment');
const { v4: uuid } = require('uuid');
const _ = require('lodash');

const budgetDynamo = new DatabaseModify('budgets');
const expenseTypeDynamo = new DatabaseModify('expense-types');

/*
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
 * Gets all expensetype data and then parses the categories
 */
async function getAllExpenseTypes() {
  let expenseTypesData = await expenseTypeDynamo.getAllEntriesInDB();
  let expenseTypes = _.map(expenseTypesData, (expenseTypeData) => {
    expenseTypeData.categories = _.map(expenseTypeData.categories, (category) => {
      return JSON.parse(category);
    });
    return new ExpenseType(expenseTypeData);
  });

  return expenseTypes;
}

/**
 * Finds an expense type given an id from a list of expense types.
 *
 * @param expenseTypes - list of ExpenseTypes
 * @param expenseTypeId - id of ExpenseType to find
 * @return ExpenseType - ExpenseType found
 */
function _getExpenseType(expenseTypes, expenseTypeId) {
  let expenseType = _.find(expenseTypes, (expenseType) => {
    return expenseType.id === expenseTypeId;
  });
  if (expenseType) {
    return expenseType;
  } else {
    throw new Error('Expense Type does not exist');
  }
} // _getExpenseType

/**
 * Handler to execute lamba function.
 * @param event - request
 * @return Object - response
 */
async function handler(event) {
  console.info(JSON.stringify(event)); // eslint-disable-line no-console

  return start();
} // handler

/**
 * Prepeares a new budget with overdrafted amounts and updates the old budget.
 *
 * @param oldBudget - old budget to carry into new budget
 * @param expenseType - Expense Type of new budget
 * @return Budget - new budget
 */
async function _makeNewBudget(oldBudget, expenseType) {
  let updatedBudget = _.cloneDeep(oldBudget);
  let newBudgetData = {
    id: uuid(),
    expenseTypeId: oldBudget.expenseTypeId,
    employeeId: oldBudget.employeeId,
    reimbursedAmount: 0,
    pendingAmount: 0,
    //increment the budgets fiscal start day by one year
    fiscalStartDate: moment(oldBudget.fiscalStartDate).add(1, 'years').format('YYYY-MM-DD'),
    //increment the budgets fiscal end day by one year
    fiscalEndDate: moment(oldBudget.fiscalEndDate).add(1, 'years').format('YYYY-MM-DD'),
    amount: expenseType.budget
  };
  let newBudget = new Budget(newBudgetData); // convert to budget object
  if (oldBudget.reimbursedAmount > expenseType.budget) {
    // reimburse amount is greater than budget
    newBudget.reimbursedAmount = oldBudget.reimbursedAmount - expenseType.budget; // set new reimburse amount
    newBudget.pendingAmount = oldBudget.pendingAmount; // set new pending amount
    updatedBudget.reimbursedAmount = expenseType.budget; // update old reimbursed amount
    updatedBudget.pendingAmount = 0; // update old pending amount
  } else {
    // set new pending amount
    newBudget.pendingAmount = oldBudget.pendingAmount + oldBudget.reimbursedAmount - expenseType.budget;
    updatedBudget.pendingAmount = expenseType.budget - oldBudget.reimbursedAmount; // update old pending amount
  }
  return budgetDynamo
    .updateEntryInDB(updatedBudget) // update old budget in database
    .then(() => {
      console.log(
        `Moving overdrafted amount of $${newBudget.reimbursedAmount} reimbursed and $${newBudget.pendingAmount}`,
        `pending to new budget: ${newBudget.id} for employee ${newBudget.employeeId} 💰💰💰`
      );
      return budgetDynamo.addToDB(newBudget); // add new budget to database
    }); // add new budget
} // _makeNewBudget

/**
 * Creates new budgets for recurring expenses.
 */
async function start() {
  console.log('Started chronos');
  let budgets = [],
    expenseTypes = [],
    numberRecurring = 0;
  try {
    //budget anniversary date is today
    const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
    let budgetsData = await budgetDynamo.querySecondaryIndexInDB('fiscalEndDate-index', 'fiscalEndDate', yesterday);
    budgets = _.map(budgetsData, (budgetData) => {
      return new Budget(budgetData);
    });
    expenseTypes = await getAllExpenseTypes();

    if (budgets.length != 0) {
      await asyncForEach(budgets, async (oldBudget) => {
        if (oldBudget.reimbursedAmount + oldBudget.pendingAmount > oldBudget.amount) {
          // old budget has overdraft
          let expenseType = _getExpenseType(expenseTypes, oldBudget.expenseTypeId);
          if (expenseType.recurringFlag && expenseType.budget == oldBudget.amount) {
            // expense type is recurring and old budget is full time
            let newBudget = await _makeNewBudget(oldBudget, expenseType);
            let msg = `Happy Anniversary employee: ${newBudget.employeeId} 🥳 \n
                       created new budget with id: ${newBudget.id}`;
            console.log(msg);
            numberRecurring++;
            return newBudget;
          }
        }
      });
      console.log(`Created ${numberRecurring} new budget${numberRecurring > 1 ? 's' : ''} tonight! 🍕`);
    } else {
      console.log('There are no new budgets being created tonight 😴🛌');
    }
  } catch (err) {
    console.error(err);
  } finally {
    console.log('Ended chronos');
  }
} // start

// module.exports = { start, handler };
// included other methods for testing
module.exports = { start, handler, asyncForEach, _getExpenseType, _makeNewBudget };
