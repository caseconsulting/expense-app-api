const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const _ = require('lodash');
const uuid = require('uuid/v4');
const Moment = require('moment');
const MomentRange = require('moment-range');
const IsoFormat = 'YYYY-MM-DD';
const moment = MomentRange.extendMoment(Moment);

const Employee = require('./../models/employee');
const Expense = require('./../models/expense');
const ExpenseType = require('./../models/expenseType');

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
    console.warn('Expense _delete');
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

  async _add(id, data) {
    console.warn('Expense _add');

    //query DB to see if Budget exists
    let expenseType, budget, expense, employee, budgets;
    expense = new Expense(data);
    expense.id = id;

    try {
      employee = new Employee(await this.employeeDynamo.findObjectInDB(expense.userId));
      expenseType = new ExpenseType(await this.expenseTypeDynamo.findObjectInDB(expense.expenseTypeId));
      this._isPurchaseWithinRange(expenseType, expense.purchaseDate);
      budgets = await this.budgetDynamo.queryWithTwoIndexesInDB(expense.userId, expense.expenseTypeId);
      if (_.isEmpty(budgets)) {
        budget = await this._createNewBudget(expenseType, employee);
      } else {
        budget = this._findBudgetWithMatchingRange(budgets, expense.purchaseDate);
      }
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

  async _update(id, data) {
    console.warn('Expense _update');
    let expenseType, budget, newExpense, employee, oldExpense, budgets;
    newExpense = new Expense(data);
    newExpense.id = id;

    try {
      oldExpense = new Expense(await this.expenseDynamo.findObjectInDB(id));
      employee = await this.employeeDynamo.findObjectInDB(newExpense.userId);
      expenseType = new ExpenseType(await this.expenseTypeDynamo.findObjectInDB(newExpense.expenseTypeId));
      budgets = await this.budgetDynamo.queryWithTwoIndexesInDB(newExpense.userId, newExpense.expenseTypeId);
      budget = this._findBudgetWithMatchingRange(budgets, oldExpense.purchaseDate);
    } catch (err) {
      throw err;
    }

    if (expenseType.id !== oldExpense.expenseTypeId) {
      let err = {
        code: 403,
        message: 'Submitted Expense\'s expenseTypeId doesn\'t match with one in the database.'
      };
      throw err;
    }
    return this.checkValidity(newExpense, expenseType, budget, employee, oldExpense)
      .then(() => this._isReimbursed(oldExpense))
      .then(() => this._performBudgetUpdate(oldExpense, newExpense, budget, budgets, expenseType))
      .then(() => this.expenseDynamo.updateEntryInDB(newExpense))
      .catch(err => {
        throw err;
      });
  }

  checkValidity(expense, expenseType, budget, employee, oldExpense) {
    console.warn('Expense checkValidity');

    let expenseTypeValid, err;
    let startDate = expenseType.recurringFlag ? budget.fiscalStartDate : expenseType.startDate;
    let endDate = expenseType.recurringFlag ? budget.fiscalEndDate : expenseType.endDate;
    let validDateRange = this._checkExpenseDate(expense.purchaseDate, startDate, endDate);
    let balanceCheck = this._checkBalance(expense, expenseType, budget, oldExpense);
    if (expense && oldExpense) {
      expenseTypeValid = expense.expenseTypeId === oldExpense.expenseTypeId;
    } else {
      expenseTypeValid = true;
    }
    let valid = expenseTypeValid && validDateRange && balanceCheck && employee.isActive;
    let errMessage = 'Expense is not valid because:';
    if (!valid) {
      if (!expenseTypeValid) {
        errMessage += ' the expense type is not valid';
      }
      if (!validDateRange) {
        errMessage += ' the expense is outside of the expense type window';
      }
      if (!balanceCheck) {
        errMessage += ' the expense is over the budget limit';
      }
      if (!employee.isActive) {
        errMessage += ' the employee is not active';
      }
    }
    err = {
      code: 403,
      message: errMessage
    };
    return valid ? Promise.resolve() : Promise.reject(err);
  }

  _checkBalance(expense, expenseType, budget, oldExpense) {
    console.warn('Expense _checkBalance');

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

    let sum = (budget.pendingAmount + budget.reimbursedAmount + expense.cost - oldCost).toFixed(2);
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
    console.warn('Expense _checkExpenseDate');
    let startDate, endDate, date, range;
    startDate = moment(stringStartDate, IsoFormat);
    endDate = moment(stringEndDate, IsoFormat);
    date = moment(purchaseDate);
    range = moment().range(startDate, endDate);
    return range.contains(date);
  }

  // TBD - duplicated from employee routes
  _getBudgetDates(hireDate) {
    console.warn('Expense _getBudgetDates');

    let currentYear = moment().year();
    let anniversaryMonth = moment(hireDate, 'YYYY-MM-DD').month(); // form 0-11
    let anniversaryDay = moment(hireDate, 'YYYY-MM-DD').date(); // from 1 to 31
    const anniversaryComparisonDate = moment([currentYear, anniversaryMonth, anniversaryDay]);
    let startYear = anniversaryComparisonDate.isSameOrBefore(moment(), 'day') ? currentYear : currentYear - 1;
    let startDate = moment([startYear, anniversaryMonth, anniversaryDay]);
    let endDate = moment([startYear + 1, anniversaryMonth, anniversaryDay - 1]);

    return {
      startDate,
      endDate
    };
  }

  _createNewBudget(expenseType, employee) {
    console.warn('Expense _createNewBudget');

    const newBudget = {
      id: uuid(),
      expenseTypeId: expenseType.id,
      userId: employee.id,
      reimbursedAmount: 0,
      pendingAmount: 0
    };
    if (expenseType.recurringFlag) {
      // TBD - duplicated from employee routes
      const dates = this._getBudgetDates(employee.hireDate);
      newBudget.fiscalStartDate = dates.startDate.format('YYYY-MM-DD');
      newBudget.fiscalEndDate = dates.endDate.format('YYYY-MM-DD');
    } else {
      newBudget.fiscalStartDate = expenseType.startDate;
      newBudget.fiscalEndDate = expenseType.endDate;
    }
    return this.budgetDynamo.addToDB(newBudget).then(() => newBudget);
  }

  _decideIfBudgetExists(budget, expense, expenseType) {
    console.warn('Expense _decideIfBudgetExists');
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
    console.warn('Expense _addExpenseToBudget');
    if (!expense.reimbursedDate) {
      budget.pendingAmount += expense.cost;
    } else {
      budget.reimbursedAmount += expense.cost;
    }
    return budget;
  }

  _isReimbursed(expense) {
    console.warn('Expense _isReimbursed');
    let err = {
      code: 403,
      message: 'expense cannot perform action because it has already been reimbursed'
    };
    return expense.reimbursedDate ? Promise.reject(err) : Promise.resolve();
  }

  _performBudgetUpdate(oldExpense, newExpense, budget, budgets, expenseType) {
    console.warn('Expense _performBudgetUpdate');
    //Just reimbursing the cost
    //if the old is unreimbursed and the new is reimbursed but the cost is the same
    if (!oldExpense.reimbursedDate && newExpense.reimbursedDate && oldExpense.cost === newExpense.cost) {
      let overdraftAmount = this._calculateOverdraft(budget, expenseType); //determine if overdrafted
      if (overdraftAmount > 0) {
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
    } else if (!oldExpense.reimbursedDate && newExpense.reimbursedDate && oldExpense.cost !== newExpense.cost) {
      //if the old is unreimbursed and the new is unreimbursed but the cost is different
      budget.pendingAmount -= oldExpense.cost; //removing old cost from pendingAmount
      budget.reimbursedAmount += newExpense.cost; //add new cost to reimbursedAmount
    } else if (!oldExpense.reimbursedDate && !newExpense.reimbursedDate && oldExpense.cost !== newExpense.cost) {
      //If an employee wants to edit before reimbursement
      //if the old is unreimbursed and the new is unreimbursed but the cost is different
      budget.pendingAmount -= oldExpense.cost; //removing old cost from pendingAmount
      budget.pendingAmount += newExpense.cost; //add new cost to pendingAmount
    }
    //update
    return this.budgetDynamo.updateEntryInDB(budget);
  }

  _removeFromBudget(budget, expense, expenseType) {
    console.warn('Expense _removeFromBudget');
    budget.pendingAmount -= expense.cost;
    if (!budget.pendingAmount && !budget.reimbursedAmount && !expenseType.recurringFlag) {
      return this.budgetDynamo.removeFromDB(budget.id);
    } else {
      return this.budgetDynamo.updateEntryInDB(budget);
    }
  }

  _isPurchaseWithinRange(expenseType, purchaseDate) {
    console.warn('Expense _isPurchaseWithinRange');
    if (expenseType.recurringFlag) {
      return true;
    } else if (expenseType.startDate && purchaseDate < expenseType.startDate) {
      throw {
        code: 403,
        message: 'Purchase Date is before ' + expenseType.startDate
      };
    } else if (expenseType.endDate && expenseType.endDate < purchaseDate) {
      throw {
        code: 403,
        message: 'Purchase Date is after ' + expenseType.endDate
      };
    } else {
      return true;
    }
  }

  _findBudgetWithMatchingRange(budgets, purchaseDate) {
    console.warn('Expense _findBudgetWithMatchingRange');
    let validBudgets = _.find(budgets, budget =>
      this._checkExpenseDate(purchaseDate, budget.fiscalStartDate, budget.fiscalEndDate)
    );
    if (validBudgets) {
      return validBudgets;
    } else {
      let err = {
        code: 403,
        message: 'Purchase Date is out of range of the budget'
      };
      throw err;
    }
  }

  _calculateOverdraft(budget, expenseType) {
    console.warn('Expense _calculateOverdraft');
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
