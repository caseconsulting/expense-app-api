const _ = require('lodash');
const databaseModify = require('./js/databaseModify');
const budgetDynamo = new databaseModify('budgets');
const expenseTypeDynamo = new databaseModify('expense-types');
const uuid = require('uuid/v4');
const moment = require('moment');

async function start() {
  let budgets, expenseTypes;
  try {
    let today = moment().format('YYYY-MM-DD');
    //budget anniversary date is today
    budgets = await budgetDynamo.querySecondaryIndexInDB('fiscalEndDate-index', 'fiscalEndDate', today);
    expenseTypes = await expenseTypeDynamo.getAllEntriesInDB(); //get all expensetypes
  } catch (err) {
    throw err;
  }

  _.forEach(budgets, oldBudget => {
    let expenseType = _getExpenseType(expenseTypes, oldBudget.expenseTypeId);
    if (expenseType.recurringFlag) {
      //filter by the ones that are recurring
      let newBudget = _makeNewBudget(oldBudget, expenseType);
      return budgetDynamo.addToDB(newBudget);
    }
  });
}

function _getExpenseType(expenseTypes, expenseTypeId) {
  return _.find(expenseTypes, expenseType => {
    return expenseType.id === expenseTypeId;
  });
}

function _makeNewBudget(oldBudget, expenseType) {
  let newBudget = {
    id: uuid(),
    expenseTypeId: oldBudget.expenseTypeId,
    userId: oldBudget.userId,
    reimbursedAmount: 0,
    pendingAmount: 0,
    fiscalStartDate: moment(oldBudget.fiscalStartDate)
      .add(1, 'years')
      .format('YYYY-MM-DD'), //increment the budgets fiscal start day by one year
    fiscalEndDate: moment(oldBudget.fiscalEndDate)
      .add(1, 'years')
      .format('YYYY-MM-DD') //increment the budgets fiscal end day by one year
  };

  // if (oldBudget.pendingAmount > expenseType.budget) {
  //   newBudget.pendingAmount = oldBudget.pendingAmount - expenseType.budget;
  // }
  if (oldBudget.reimbursedAmount > expenseType.budget) {
    newBudget.reimbursedAmount = oldBudget.reimbursedAmount - expenseType.budget;
  }
  return newBudget;
}

module.exports = { start };
