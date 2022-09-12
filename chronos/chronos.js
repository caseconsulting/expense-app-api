let lib;

const Budget = require('./models/budget');
const ExpenseType = require('./models/expenseType');
const DatabaseModify = require('./js/databaseModify');
const moment = require('moment-timezone');
moment.tz.setDefault('America/New_York');
const { v4: uuid } = require('uuid');
const _ = require('lodash');
const Employee = require('./models/employee');
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
  return uuid();
} // _getUUID

/**
 * Handler for creating new tech budget that accounts for employee MiFi status.
 *
 * @returns number of new tech budgets created
 */
async function _handleMiFiStatusBudgetAdjustment() {
  const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
  let employees = await lib._employeeDynamo().querySecondaryIndexInDB('hireDate-index', 'hireDate', yesterday);
  let budgetsCreated = 0;
  if (employees.length != 0) {
    let fullTimeEmployees = employees.filter((e) => e.workStatus == 100);
    await lib._asyncForEach(fullTimeEmployees, async (employee) => {
      if (employee.mifiStatus != null && employee.mifiStatus != undefined && employee.mifiStatus == false) {
        let newBudget = await lib._makeNewTechBudgetWithMiFiStatusAdjustment();
        let msg = `Happy Anniversary employee: ${employee.id} 🥳 \n
                       created new budget with id: ${newBudget.id}`;
        console.log(msg);
        budgetsCreated++;
      }
    });
  }
  return budgetsCreated;
} // _handleMiFiStatusBudgetAdjustment

/**
 * Creates new tech budget with MiFi addition (150)
 * @param employee employee to creat new tech budget for
 * @returns newly created budget object
 */
async function _makeNewTechBudgetWithMiFiStatusAdjustment(employee) {
  let techExpenseType = (await lib._getAllExpenseTypes()).find(
    (expenseType) => expenseType.budgetName === 'Technology'
  );

  let hireDate = moment(employee.hireDate, ISOFORMAT);
  let hireMonth = hireDate.month(); // form 0-11
  let hireDay = hireDate.date(); // from 1 to 31
  let today = moment();

  let startYear = today.year();

  let startDate = moment([startYear, hireMonth, hireDay]);
  let endDate = moment([startYear, hireMonth, hireDay]).add('1', 'years').subtract('1', 'days');

  let mifiAddition = 150;

  let newBudgetData = (newBudgetData = {
    id: lib._getUUID(),
    expenseTypeId: techExpenseType.id,
    employeeId: employee.id,
    reimbursedAmount: 0,
    pendingAmount: 0,
    //increment the budgets fiscal start day by one year
    fiscalStartDate: startDate,
    //increment the budgets fiscal end day by one year
    fiscalEndDate: endDate,
    amount: techExpenseType.budget + mifiAddition
  });
  let newBudget = new Budget(newBudgetData);
  return lib._budgetDynamo().addToDB(newBudget); // add new budget to database
} // _makeNewTechBudgetWithMiFiStatusAdjustment

/**
 * Handler for creating new budgets that account for overdraft
 *
 * @returns number of new budgets created
 */
async function _handleNewBudgetsWithOverdraft() {
  const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
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
  let mifiAddition = 0;

  if (expenseType.budgetName === 'Technology') {
    let budgetEmployee = lib._getBudgetEmployee(oldBudget.employeeId);
    if (
      budgetEmployee.mifiStatus !== undefined &&
      budgetEmployee.mifiStatus !== null &&
      budgetEmployee.mifiStatus === false
    ) {
      //opted out of mifi add 150 dollars
      console.info('Mifi status is set to false, adding tech budget for employee');
      mifiAddition = 150;
    }
  }
  let newBudgetData = {
    id: lib._getUUID(),
    expenseTypeId: oldBudget.expenseTypeId,
    employeeId: oldBudget.employeeId,
    reimbursedAmount: 0,
    pendingAmount: 0,
    //increment the budgets fiscal start day by one year
    fiscalStartDate: moment(oldBudget.fiscalStartDate).add(1, 'years').format('YYYY-MM-DD'),
    //increment the budgets fiscal end day by one year
    fiscalEndDate: moment(oldBudget.fiscalEndDate).add(1, 'years').format('YYYY-MM-DD'),
    amount: expenseType.budget + mifiAddition
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
 * Creates new budgets for recurring expenses.
 */
async function start() {
  console.log('Started chronos');
  try {
    let budgetsCreated = 0;
    // let [newBudgetsCreatedWithOverdraft, newTechBudgetsCreated] = await Promise.all([
    //   lib._handleNewBudgetsWithOverdraft(),
    //   lib._handleMiFiStatusBudgetAdjustment()
    // ]);
    // budgetsCreated += newBudgetsCreatedWithOverdraft + newTechBudgetsCreated;
    let newBudgetsCreatedWithOverdraft = await lib._handleNewBudgetsWithOverdraft();
    let newTechBudgetsCreated = await lib._handleMiFiStatusBudgetAdjustment();
    budgetsCreated += newBudgetsCreatedWithOverdraft + newTechBudgetsCreated;
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
  _getAllExpenseTypes,
  _getBudgetEmployee,
  _getExpenseType,
  _getUUID,
  _makeNewBudget,
  _makeNewTechBudgetWithMiFiStatusAdjustment,
  _handleMiFiStatusBudgetAdjustment,
  _handleNewBudgetsWithOverdraft,
  start,
  handler
};
module.exports = lib;
