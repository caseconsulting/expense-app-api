const _ = require('lodash');
const databaseModify = require('./js/databaseModify');
const budgetDynamo = new databaseModify('budgets');
const expenseTypeDynamo = new databaseModify('expense-types');
const uuid = require('uuid/v4');
const moment = require('moment');

async function start() {
  console.log('started');
  let budgets = [],
    expenseTypes = [];
  try {
    //budget anniversary date is today
    const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
    budgets = await budgetDynamo.querySecondaryIndexInDB('fiscalEndDate-index', 'fiscalEndDate', yesterday);
    expenseTypes = await expenseTypeDynamo.getAllEntriesInDB(); //get all expensetypes

    console.log(`Creating ${budgets.length} new budgets tonight! 🍕`);
    await asyncForEach(budgets, async oldBudget => {
      let expenseType = _getExpenseType(expenseTypes, oldBudget.expenseTypeId);
      if (expenseType.recurringFlag) {
        //filter by the ones that are recurring
        let newBudget = _makeNewBudget(oldBudget, expenseType);
        console.log(`Happy Anniversary user: ${newBudget.userId} 🥳 \n created new budget with id: ${newBudget.id}`);
        return await budgetDynamo.addToDB(newBudget);
      }
    });
  } catch (err) {
    if (err.message && err.message === 'Item not found') {
      console.warn('No employees with an anniversary today');
    } else {
      console.error(err);
    }
  } finally {
    console.log('ended');
  }
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
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
  if (oldBudget.reimbursedAmount > expenseType.budget) {
    let overage = oldBudget.reimbursedAmount - expenseType.budget;
    newBudget.reimbursedAmount = overage;
  }
  return newBudget;
}

async function handler(event) { 
  console.info(JSON.stringify(event)); // eslint-disable-line no-console

  return start();
}

module.exports = { start, handler };
