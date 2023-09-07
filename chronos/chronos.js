let lib;

const _ = require('lodash');
const Budget = require(process.env.AWS ? 'budget' : '../models/budget');
const Employee = require(process.env.AWS ? 'employee' : '../models/employee');
const ExpenseType = require(process.env.AWS ? 'expenseType' : '../models/expenseType');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const dateUtils = require(process.env.AWS ? 'dateUtils' : '../js/dateUtils');
const { generateUUID } = require(process.env.AWS ? 'utils' : '../js/utils');

const ISOFORMAT = 'YYYY-MM-DD';

/**
 * Returns a new DatabaseModify for budgets
 *
 * @return - database modify for budgets
 */
function _budgetDynamo() {
  return new DatabaseModify('budgets');
} //_budgetDynamo

/**
 * Returns a new DatabaseModify for expense-types
 *
 * @return - database modify for expenseTypes
 */
function _expenseTypeDynamo() {
  return new DatabaseModify('expense-types');
} //_expenseTypeDynamo

/**
 * Returns a new DatabaseModify for employees
 *
 * @return - database modify for employees
 */
function _employeeDynamo() {
  return new DatabaseModify('employees');
} // _employeeDynamo

/**
 * Async function to loop an array.
 *
 * @param array - Array of elements to iterate over
 * @param callback - callback function
 */
async function _asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
} // _asyncForEach

/**
 * Gets all expensetype data and then parses the categories
 *
 * @return - all the expenseType data
 */
async function _getAllExpenseTypes() {
  let expenseTypesData = await lib._expenseTypeDynamo().getAllEntriesInDB();
  let expenseTypes = _.map(expenseTypesData, (expenseTypeData) => {
    expenseTypeData.categories = _.map(expenseTypeData.categories, (category) => {
      return JSON.parse(category);
    });
    return new ExpenseType(expenseTypeData);
  });

  return expenseTypes;
} // _getAllExpenseTypes

/**
 * Gets all employees
 *
 * @returns all employees
 */
async function _getAllEmployees() {
  return (await lib._employeeDynamo().getAllEntriesInDB()).map((employee) => new Employee(employee));
} // _getAllEmployees

/**
 * Gets the employee tied to the budget
 *
 * @param {*} employeeId = id of the employee tied to the budget
 * @return - employee tied to the budget
 */
async function _getBudgetEmployee(employeeId) {
  let employee = await lib._employeeDynamo().getEntry(employeeId);
  return new Employee(employee);
} // _getBudgetEmployee

/**
 * Finds an expense type given an id from a list of expense types.
 *
 * @param expenseTypes - list of ExpenseTypes
 * @param expenseTypeId - id of ExpenseType to find
 * @return - ExpenseType - ExpenseType found
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
 * Generates and returns a new uuid.
 *
 * @return String - new uuid
 */
function _getUUID() {
  return generateUUID();
} // _getUUID

/**
 * Handler for creating new budgets that account for overdraft
 *
 * @returns number of new budgets created
 */
async function _handleNewBudgetsWithOverdraft() {
  const yesterday = dateUtils.format(dateUtils.subtract(dateUtils.getTodaysDate(ISOFORMAT), 1, 'day'), null, ISOFORMAT);
  let budgetsData = await lib
    ._budgetDynamo()
    .querySecondaryIndexInDB('fiscalEndDate-index', 'fiscalEndDate', yesterday);
  let budgets = _.map(budgetsData, (budgetData) => {
    return new Budget(budgetData);
  });
  let expenseTypes = await lib._getAllExpenseTypes();
  let numberRecurring = 0;

  if (budgets.length != 0) {
    await lib._asyncForEach(budgets, async (oldBudget) => {
      if (oldBudget.reimbursedAmount + oldBudget.pendingAmount > oldBudget.amount) {
        // old budget has overdraft
        let expenseType = lib._getExpenseType(expenseTypes, oldBudget.expenseTypeId);
        if (expenseType.recurringFlag && expenseType.budget == oldBudget.amount) {
          // expense type is recurring and old budget is full time
          let newBudget = await lib._makeNewBudget(oldBudget, expenseType);
          let msg = `Happy Anniversary employee: ${newBudget.employeeId} 🥳 \n
                       created new budget with id: ${newBudget.id}`;
          console.log(msg);
          numberRecurring++;
          return newBudget;
        }
      }
    });
  }
  return numberRecurring;
} // _handleNewBudgetsWithOverdraft

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
    id: lib._getUUID(),
    expenseTypeId: oldBudget.expenseTypeId,
    employeeId: oldBudget.employeeId,
    reimbursedAmount: 0,
    pendingAmount: 0,
    //increment the budgets fiscal start day by one year
    fiscalStartDate: dateUtils.format(dateUtils.add(oldBudget.fiscalStartDate, 1, 'year'), null, ISOFORMAT),
    //increment the budgets fiscal end day by one year
    fiscalEndDate: dateUtils.format(dateUtils.add(oldBudget.fiscalEndDate, 1, 'year'), null, ISOFORMAT),
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
  return lib
    ._budgetDynamo()
    .updateEntryInDB(updatedBudget) // update old budget in database
    .then(() => {
      console.log(
        `Moving overdrafted amount of $${newBudget.reimbursedAmount} reimbursed and $${newBudget.pendingAmount}`,
        `pending to new budget: ${newBudget.id} for employee ${newBudget.employeeId} 💰💰💰`
      );
      return lib._budgetDynamo().addToDB(newBudget); // add new budget to database
    }); // add new budget
} // _makeNewBudget

/**
 * Checks if today is employees anniversary date.
 *
 * @param employee employee object
 * @returns true if today is employees anniversary date, false otherwise
 */
function _isAnniversaryDate(employee) {
  let hireDate = dateUtils.format(employee.hireDate, null, ISOFORMAT);
  let today = dateUtils.getTodaysDate();
  return (
    dateUtils.getMonth(hireDate) == dateUtils.getMonth(today) && dateUtils.getDay(hireDate) == dateUtils.getDay(today)
  );
} // _isAnniversaryDate

/**
 * Creates new budgets for recurring expenses.
 */
async function start() {
  console.log('Started chronos');
  try {
    let budgetsCreated = 0;
    let newBudgetsCreatedWithOverdraft = await lib._handleNewBudgetsWithOverdraft();
    budgetsCreated += newBudgetsCreatedWithOverdraft;
    if (budgetsCreated != 0) {
      console.log(`Created ${budgetsCreated} new budget${budgetsCreated > 1 ? 's' : ''} tonight! 🍕`);
    } else {
      console.log('There are no new budgets being created tonight 😴🛌');
    }
  } catch (err) {
    console.error(err);
  } finally {
    console.log('Ended chronos');
  }
} // start

/**
 * Handler to execute Lambda function.
 * @param event - request
 * @return Object - response
 */
async function handler(event) {
  console.info(JSON.stringify(event)); // eslint-disable-line no-console

  return lib.start();
} // handler

// module.exports = { start, handler };
// included other methods for testing
lib = {
  _budgetDynamo,
  _expenseTypeDynamo,
  _employeeDynamo,
  _asyncForEach,
  _isAnniversaryDate,
  _getAllEmployees,
  _getAllExpenseTypes,
  _getBudgetEmployee,
  _getExpenseType,
  _getUUID,
  _makeNewBudget,
  _handleNewBudgetsWithOverdraft,
  start,
  handler
};
module.exports = lib;
