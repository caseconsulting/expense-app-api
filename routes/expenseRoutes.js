const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const _ = require('lodash');
const uuid = require('uuid/v4');
const Moment = require('moment');
const MomentRange = require('moment-range');
const IsoFormat = 'YYYY-MM-DD';
const moment = MomentRange.extendMoment(Moment);

class ExpenseRoutes extends Crud {
  constructor() {
    super();
    this.budgetDynamo = new databaseModify('budgets');
    this.expenseTypeDynamo = new databaseModify('expense-types');
    this.employeeDynamo = new databaseModify('employees');
    this.expenseDynamo = new databaseModify('expenses');
    this.databaseModify = this.expenseDynamo;
    this.moment = moment;
  }

  async _delete(id) {
    let expense, budget, expenseType, budgets;

    try {
      expense = await this.expenseDynamo.findObjectInDB(id);
      budgets = await this.budgetDynamo.queryWithTwoIndexesInDB(expense.userId, expense.expenseTypeId);
      expenseType = await this.expenseTypeDynamo.findObjectInDB(expense.expenseTypeId);
      budget = this._findBudgetWithMatchingRange(budgets, expense.purchaseDate);
    } catch (err) {
      throw err;
    }
    return this._isReimbursed(expense)
      .then(() => this._removeFromBudget(budget, expense, expenseType))
      .then(() => this.expenseDynamo.removeFromDB(id))
      .catch(err => {
        throw err;
      });
  }

  async _add(uuid, { purchaseDate, reimbursedDate, cost, description, note, receipt, expenseTypeId, userId }) {
    //query DB to see if Budget exists
    let expenseType, budget, expense, employee, budgets;
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
      createdAt: moment().format(IsoFormat)
    };
    try {
      employee = await this.employeeDynamo.findObjectInDB(expense.userId);
      expenseType = await this.expenseTypeDynamo.findObjectInDB(expenseTypeId);
      budgets = await this.budgetDynamo.queryWithTwoIndexesInDB(userId, expenseTypeId);
      budget = this._findBudgetWithMatchingRange(budgets, expense.purchaseDate);
    } catch (err) {
      throw err;
    }

    return this.checkValidity(expense, expenseType, budget, employee)
      .then(() => this._decideIfBudgetExists(budget, expense, expenseType))
      .then(() => this.expenseDynamo.addToDB(expense))
      .catch(err => {
        throw err;
      });
  }

  async _update(
    id,
    { purchaseDate, reimbursedDate, cost, description, note, receipt, expenseTypeId, userId, createdAt }
  ) {
    let expenseType, budget, newExpense, employee, oldExpense, budgets;
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
      budgets = await this.budgetDynamo.queryWithTwoIndexesInDB(userId, expenseTypeId);
      budget = this._findBudgetWithMatchingRange(budgets, oldExpense.purchaseDate);
    } catch (err) {
      throw err;
    }

    if (expenseType.id === oldExpense.expenseTypeId) {
      let err = {
        code: 403,
        message: 'Submitted Expense\'s expenseTypeId doesn\'t match with one in the database.'
      };
      throw err;
    }
    return  this.checkValidity(newExpense, expenseType, budget, employee, oldExpense)
      .then(() => this._isReimbursed(oldExpense))
      .then(() => this._performBudgetUpdate(oldExpense, newExpense, budget, budgets, expenseType))
      .then(() => this.expenseDynamo.updateEntryInDB(newExpense))
      .catch(err => {
        throw err;
      });
  }

  checkValidity(expense, expenseType, budget, employee, oldExpense) {
    let validDateRange = this._checkExpenseDate(expense.purchaseDate, expenseType.startDate, expenseType.endDate);
    let balanceCheck = this._checkBalance(expense, expenseType, budget, oldExpense);

    let valid =
      (validDateRange ||
        (budget && expenseType.recurringFlag)) &&
      balanceCheck &&
      employee.isActive;
    let err = {
      code: 403,
      message: `expense is not valid because either
        1.) the employee is not active.
        2.) because the expense is over the budget limit.
        3.) expense is outside of the expenseType window.`
    };
    return valid ? Promise.resolve() : Promise.reject(err);
  }

  _checkBalance(expense, expenseType, budget, oldExpense) {

    let oldCost = oldExpense ? oldExpense.cost : 0;
    if (!budget && expense.cost <= expenseType.budget) {
      // no budget exists yet, but the cost is valid
      return true;
    } else if (!budget && expense.cost <= expenseType.budget * 2 && expenseType.odFlag) {
      // if no budget exists yet, the expense type is overdraftable and the cost is valid
      return true;
    } else if (!budget) {
      // any other case where the budget is null
      return false;
    }

    let sum = budget.pendingAmount + budget.reimbursedAmount + expense.cost - oldCost;
    if (sum <= expenseType.budget) {
      return true;
    } else if (expenseType.odFlag && sum <= 2 * expenseType.budget) {
      //enough OD balance
      return true;
    } else {
      return false;
    }
  }

  _checkExpenseDate(purchaseDate, stringStartDate, stringEndDate) {
    let startDate, endDate, date, range;
    startDate = moment(stringStartDate, IsoFormat);
    endDate = moment(stringEndDate, IsoFormat);
    date = moment(purchaseDate);
    range = moment().range(startDate, endDate);
    return range.contains(date);
  }

  _decideIfBudgetExists(budget, expense, expenseType) {
    //if the budget does exist, add the cost of this expense to the pending balance of that budget
    if (budget) {
      budget = this._addExpenseToBudget(expense, budget);
      return this.budgetDynamo.updateEntryInDB(budget);
    } else {
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

  _isReimbursed(expense) {
    let err = {
      code: 403,
      message: 'expense cannot perform action because it has already been reimbursed'
    };
    return expense.reimbursedDate ? Promise.reject(err) : Promise.resolve();
  }

  _performBudgetUpdate(oldExpense, newExpense, budget, budgets, expenseType) {
    //Just reimbursing the cost
    //if the old is unreimbursed and the new is reimbursed but the cost is the same
    if (!oldExpense.reimbursedDate && newExpense.reimbursedDate && oldExpense.cost === newExpense.cost) {
      let overdraftAmount = this._calculateOverdraft(budget, expenseType); //determine if overdrafted
      if (overdraftAmount) {
        //is overdrafted
        //move purchaseDate to next year
        let purchaseIncremented = moment(newExpense.purchaseDate, IsoFormat).add(1, 'years');
        let nextYearsBudget = this._findBudgetWithMatchingRange(budgets, purchaseIncremented); // get next years budget
        if (nextYearsBudget) {
          //if next years budget exists
          budget.pendingAmount -= oldExpense.cost; // removing from pendingAmount
          budget.reimbursedAmount += newExpense.cost;
          if (budget.reimbursedAmount >= expenseType.budget) {
            //get overdrafted amount
            //move to next year
            let overAmount = budget.reimbursedAmount - expenseType.budget;
            budget.reimbursedAmount -= overAmount;
            nextYearsBudget.reimbursedAmount += overAmount;
            return this.budgetDynamo.updateEntryInDB(nextYearsBudget).then(this.budgetDynamo.updateEntryInDB(budget));
          }
        } else {
          // normal reimburse
          //if next budget does not exist
          budget.pendingAmount -= oldExpense.cost; // removing from pendingAmount
          budget.reimbursedAmount += newExpense.cost; //adding to reimbursedAmount
        }
      } else {
        // normal reimburse
        budget.pendingAmount -= oldExpense.cost; // removing from pendingAmount
        budget.reimbursedAmount += newExpense.cost; //adding to reimbursedAmount
      }
    }
    //if the old is unreimbursed and the new is unreimbursed but the cost is different
    else if (!oldExpense.reimbursedDate && newExpense.reimbursedDate && oldExpense.cost !== newExpense.cost) {
      budget.pendingAmount -= oldExpense.cost; //removing old cost from pendingAmount
      budget.reimbursedAmount += newExpense.cost; //add new cost to reimbursedAmount
    }
    //If an employee wants to edit before reimbursement
    //if the old is unreimbursed and the new is unreimbursed but the cost is different
    else if (!oldExpense.reimbursedDate && !newExpense.reimbursedDate && oldExpense.cost !== newExpense.cost) {
      budget.pendingAmount -= oldExpense.cost; //removing old cost from pendingAmount
      budget.pendingAmount += newExpense.cost; //add new cost to pendingAmount
    }
    //update
    return this.budgetDynamo.updateEntryInDB(budget);
  }

  _removeFromBudget(budget, expense, expenseType) {
    budget.pendingAmount -= expense.cost;
    if (!budget.pendingAmount && !budget.reimbursedAmount && !expenseType.recurringFlag) {
      return this.budgetDynamo.removeFromDB(budget.id);
    } else {
      return this.budgetDynamo.updateEntryInDB(budget);
    }
  }

  _findBudgetWithMatchingRange(budgets, purchaseDate) {
    return _.find(budgets, budget =>
      this._checkExpenseDate(purchaseDate, budget.fiscalStartDate, budget.fiscalEndDate)
    );
  }

  _calculateOverdraft(budget, expenseType) {
    let sum = budget.reimbursedAmount + budget.pendingAmount;
    if (expenseType.odFlag && sum > expenseType.budget) {
      let difference = sum - expenseType.budget;
      return difference;
    } else {
      return 0;
    }
  }
}
module.exports = ExpenseRoutes;
