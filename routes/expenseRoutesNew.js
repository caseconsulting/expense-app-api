const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const budgetDynamo = new databaseModify('Budgets');
const expenseTypeDynamo = new databaseModify('ExpenseType');
const employeeDynamo = new databaseModify('Employee');
const expenseDynamo = new databaseModify('Expense');
// const _ = require('lodash');
const uuid = require('uuid/v4');

const Moment = require('moment');
const MomentRange = require('moment-range');

const moment = MomentRange.extendMoment(Moment);
class ExpenseRoutes extends Crud {
  constructor(databaseModify, uuid) {
    super(databaseModify, uuid);
    this.databaseModify = databaseModify;
    this.budgetDynamo = budgetDynamo;
    this.expenseTypeDynamo = expenseTypeDynamo;
    this.employeeDynamo = employeeDynamo;
    this.expenseDynamo = expenseDynamo;
    this.moment = moment;
  }

  _delete(id) {
    return this.databaseModify
      .findObjectInDB(id)
      .then(expense => this.deleteCostFromBudget(expense.expenseTypeId, expense.userId, expense.cost))
      .catch(err => {
        throw err;
      });
  }

  async _add(uuid, {purchaseDate,reimbursedDate,cost,description,note,receipt,expenseTypeId,userId,createdAt}) {
    //query DB to see if Budget exists
    let expenseType, budget, expense, employee;
    expense = {
      id: uuid,
      purchaseDate: purchaseDate,
      reimbursedDate: reimbursedDate,
      cost: cost,
      description: description,
      note: note,
      receipt: receipt,
      expenseTypeId: expenseTypeId,
      userId: userId,
      createdAt: createdAt};

    employee = await this.employeeDynamo.findObjectInDB(expense.userId);
    expenseType = await this.expenseTypeDynamo.findObjectInDB(expenseTypeId);
    budget = await this.budgetDynamo.queryWithTwoIndexesInDB(userId, expenseTypeId);

    return this.checkValidity(expense, expenseType, budget, employee)
      .then(() => this._decideIfBudgetExists(budget, expense , expenseType))
      .then(() => this.expenseDynamo.addToDB(expense))
      .catch(err => { throw err; });
  }

  checkValidity(expense, expenseType, budget, employee) {
    let valid = this._checkExpenseDate(expense, expenseType)
        && this._checkBalance(expense, expenseType, budget)
        && employee.isActive;
    let err = {
      status: 403,
      message: `expense is not valid because either
        1.) the employee is not active or
        2.) because the expense is over the budget limit.`
    };
    return valid ? Promise.resolve() : Promise.reject(err);
  }

  _checkBalance(expense, expenseType, budget){
    if(budget === null && expense.cost <= expenseType.budget){
      return true;
    }

    let sum = budget.pendingAmount + budget.reimbursedAmount + expense.cost;
    if (sum <= expenseType.budget) {
      return true;
    }
    else if (expenseType.odFlag && sum <= (2 * expenseType.budget)) {//enough OD balance
      return true;
    }
    else {
      return false;
    }
  }

  _checkExpenseDate(expense, expenseType) {
    let startDate = moment(expenseType.startDate, 'MM-DD-YYYY');
    let endDate   = moment(expenseType.endDate, 'MM-DD-YYYY');
    let date  = moment(expense.purchaseDate);
    let range = moment().range(startDate, endDate);
    let dateValid = range.contains(date); //true or false

    return dateValid;
  }

  _decideIfBudgetExists(budget, expense, expenseType) {
    //if the budget does exist, add the cost of this expense to the pending balance of that budget
    if (budget) {
      budget = this._addExpenseToBudget(expense, budget);
      return this.budgetDynamo.updateEntryInDB(budget);
    }
    else {
      let newBudget = {
        id: uuid(),
        expenseTypeId: expense.expenseTypeId,
        userId: expense.userId,
        reimbursedAmount: 0,
        pendingAmount: 0,
        fiscalStartDate: expenseType.startDate,
        fiscalEndDate: expenseType.endDate
      };
      newBudget = this._addExpenseToBudget(expense, newBudget);
      return this.budgetDynamo.addToDB(newBudget);
    }
  }

  _addExpenseToBudget(expense, budget) {
    if (!expense.reimbursedDate) {
      budget.pendingAmount += expense.cost;
    } else {
      budget.reimbursedAmount += expense.cost;
    }
    return budget;
  }

  // _createFiscalYear(employee, expenseType) {
  //   let start, end;
  //   if (expenseType.recurringFlag) {
  //     //For the script?
  //     // let hireDate = moment(employee.hireDate);
  //     // let hireYear = hireDate.year();
  //     // let currentYear = moment().year();
  //     // let yearDiff = currentYear - hireYear;
  //     // let fiscalStartDate = hireDate.add(yearDiff, 'years');
  //     // let fiscalEndDate = fiscalStartDate.add(1, 'years');
  //     //
  //     // fiscalEndDate = fiscalEndDate.subtract(1, 'days');
  //     // start = moment(fiscalStartDate).format('MM-DD-YYYY');
  //     // end = moment(fiscalEndDate).format('MM-DD-YYYY');
  //   }
  //   else {
  //     start = expenseType.fiscalStartDate;
  //     end = expenseType.fiscalEndDate;
  //   }
  //   return {
  //     startDate: start,
  //     endDate: end
  //   };
  // }


  /**
   * Removes the previous information from the database, including from employee's
   *  balance
   * adds the new information
   */
  // _update(id, {purchaseDate,reimbursedDate,cost,description,note,receipt,expenseTypeId,userId,createdAt}) {}


}
module.exports = ExpenseRoutes;
