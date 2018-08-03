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

  async _delete(id) {
    let expense, budget,expenseType;

    expense = await this.expenseDynamo.findObjectInDB(id);
    budget = await this.budgetDynamo.queryWithTwoIndexesInDB(expense.userId, expense.expenseTypeId);
    expenseType = await this.expenseTypeDynamo.findObjectInDB(expense.expenseTypeId);

    return this._isReimbursed(expense)
      .then(() => this._removeFromBudget(budget, expense, expenseType))
      .then(() => this.expenseDynamo.removeFromDB(id))
      .catch((err) => { throw err; });

  }

  async _add(uuid, {purchaseDate,reimbursedDate,cost,description,note,receipt,expenseTypeId,userId}) {
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
      createdAt: moment().format('YYYY-MM-DD')
    };
    try{
      employee = await this.employeeDynamo.findObjectInDB(expense.userId);
      expenseType = await this.expenseTypeDynamo.findObjectInDB(expenseTypeId);
      budget = await this.budgetDynamo.queryWithTwoIndexesInDB(userId, expenseTypeId);

    }
    catch(err){
      throw err;
    }

    return this.checkValidity(expense, expenseType, budget, employee)
      .then(() => this._decideIfBudgetExists(budget, expense , expenseType))
      .then(() => this.expenseDynamo.addToDB(expense))
      .catch(err => { throw err; });
  }

  async _update(id, {purchaseDate,reimbursedDate,cost,description,note,receipt,expenseTypeId,userId,createdAt}) {
    let expenseType, budget, newExpense, employee, oldExpense;
    newExpense = {
      id: id,
      purchaseDate: purchaseDate,
      reimbursedDate: reimbursedDate,
      cost: cost,
      description: description,
      note: note,
      receipt: receipt,
      expenseTypeId: expenseTypeId,
      userId: userId,
      createdAt: createdAt
    };
    try {
      oldExpense = await this.expenseDynamo.findObjectInDB(id);
      employee = await this.employeeDynamo.findObjectInDB(userId);
      expenseType = await this.expenseTypeDynamo.findObjectInDB(expenseTypeId);
      budget = await this.budgetDynamo.queryWithTwoIndexesInDB(userId, expenseTypeId);
    }
    catch (err) {
      throw err;
    }

    return this.checkValidity(newExpense, expenseType, budget, employee)
      .then(()=> this._isReimbursed(oldExpense))
      .then(()=> this._performBudgetUpdate(oldExpense, newExpense, budget))
      .then(()=> this.expenseDynamo.updateEntryInDB(newExpense))
      .catch(err => { throw err; });
  }



  checkValidity(expense, expenseType, budget, employee) {
    let valid = this._checkExpenseDate(expense, expenseType)
        && this._checkBalance(expense, expenseType, budget)
        && employee.isActive;
    let err = {
      code: 403,
      message: `expense is not valid because either
        1.) the employee is not active.
        2.) because the expense is over the budget limit.
        3.) expense is outside of the expenseType window.`
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

  _isReimbursed(expense){
    let err = {
      code: 403,
      message: 'expense cannot perform action because it has already been reimbursed'
    };
    return expense.reimbursedDate ? Promise.reject(err) : Promise.resolve();
  }

  _performBudgetUpdate(oldExpense, newExpense, budget){
    //Just reimbursing the cost
    //if the old is unreimbursed and the new is reimbursed but the cost is the same
    if (!oldExpense.reimbursedDate && newExpense.reimbursedDate &&
        oldExpense.cost === newExpense.cost) {
      budget.pendingAmount -= oldExpense.cost; // removing from pendingAmount
      budget.reimbursedAmount += newExpense.cost; //adding to reimbursedAmount
    }
    //if the old is unreimbursed and the new is unreimbursed but the cost is different
    else if (!oldExpense.reimbursedDate && newExpense.reimbursedDate &&
        oldExpense.cost !== newExpense.cost) {
      budget.pendingAmount -= oldExpense.cost; //removing old cost from pendingAmount
      budget.reimbursedAmount += newExpense.cost; //add new cost to reimbursedAmount
    }
    //If an employee wants to edit before reimbursement
    //if the old is unreimbursed and the new is unreimbursed but the cost is different
    else if (!oldExpense.reimbursedDate && !newExpense.reimbursedDate &&
        oldExpense.cost !== newExpense.cost) {
      budget.pendingAmount -= oldExpense.cost; //removing old cost from pendingAmount
      budget.pendingAmount += newExpense.cost; //add new cost to pendingAmount
    }
    //update
    return this.budgetDynamo.updateEntryInDB(budget);
  }

  _removeFromBudget(budget, expense, expenseType){
    budget.pendingAmount -= expense.cost;
    if(!budget.pendingAmount && !budget.reimbursedAmount && !expenseType.recurringFlag){
      return this.budgetDynamo.removeFromDB(budget.id);
    } else {
      return this.budgetDynamo.updateEntryInDB(budget);
    }
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



}
module.exports = ExpenseRoutes;
