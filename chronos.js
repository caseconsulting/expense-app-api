const _ = require('lodash');
const databaseModify = require('./js/databaseModify');
const budgetDynamo = new databaseModify('budgets');
const expenseTypeDynamo = new databaseModify('expense-types');
const uuid = require('uuid/v4');
const moment = require('moment');

async function start() {
  console.log('Started chronos');
  let budgets = [],
    expenseTypes = [],
    numberRecurring = 0;
  try {
    //budget anniversary date is today
    const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
    budgets = await budgetDynamo.querySecondaryIndexInDB('fiscalEndDate-index', 'fiscalEndDate', yesterday);
    expenseTypes = await expenseTypeDynamo.getAllEntriesInDB(); //get all expensetypes

    if (budgets.length != 0) {
      await asyncForEach(budgets, async oldBudget => {
        let expenseType = _getExpenseType(expenseTypes, oldBudget.expenseTypeId);
        if (expenseType.recurringFlag) {
        //filter by the ones that are recurring
          let newBudget = _makeNewBudget(oldBudget, expenseType);
          console.log(`Happy Anniversary user: ${newBudget.userId} 🥳 \n created new budget with id: ${newBudget.id}`);
          numberRecurring++;
          return await budgetDynamo.addToDB(newBudget);
        }
      });
      console.log(`Created ${numberRecurring} new budget${numberRecurring > 1 ? 's' : ''} tonight! 🍕`);
    }
    else {
      console.log('There are no new budgets being created tonight 😴🛌');
    }
  } catch (err) {
    console.error(err);
  } finally {
    console.log('Ended chronos');
  }
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

function _getExpenseType(expenseTypes, expenseTypeId) {
  let expenseType = _.find(expenseTypes, expenseType => {
    return expenseType.id === expenseTypeId;
  });
  if (expenseType) {
    return expenseType;
  }
  else {
    throw new Error('Expense Type does not exist');
  }
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
    console.log(`
    Moving overdrafted amount of ${overage} to new budget: ${newBudget.id} for user ${newBudget.userId} 💰💰💰`);
  }
  return newBudget;
}

async function handler(event) { 
  console.info(JSON.stringify(event)); // eslint-disable-line no-console

  return start();
}

module.exports = { start, handler };
