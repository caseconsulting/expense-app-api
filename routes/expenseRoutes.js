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
const Budget = require('./../models/budget');

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
    console.warn(moment().format(), 'Expense _delete', `for expense ${id}`);

    let expense, budget, expenseType, rawBudgets;
    var budgets = [];

    try {
      expense = new Expense(await this.expenseDynamo.findObjectInDB(id));
      rawBudgets = await this.budgetDynamo.queryWithTwoIndexesInDB(expense.userId, expense.expenseTypeId);
      rawBudgets.forEach(function(e) {
        budgets.push(new Budget(e));
      });
      expenseType = new ExpenseType(await this.expenseTypeDynamo.findObjectInDB(expense.expenseTypeId));
      budget = new Budget(this._findBudgetWithMatchingRange(budgets, expense.purchaseDate));
    } catch (err) {
      console.error('Error Code: ' + err.code);
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
    console.warn(moment().format(), 'Expense _add', `for expense ${id}`);

    //query DB to see if Budget exists
    let expenseType, budget, expense, employee, rawBudgets;
    var budgets = [];

    expense = new Expense(data);
    expense.id = id;

    console.warn(
      moment().format(),
      'Expense _add',
      `for expense type id ${expense.expenseTypeId} for user ${expense.userId}`
    );
    try {
      employee = new Employee(await this.employeeDynamo.findObjectInDB(expense.userId));
      expenseType = new ExpenseType(await this.expenseTypeDynamo.findObjectInDB(expense.expenseTypeId));
      if (expenseType.isInactive) {
        let err = {
          code: 403,
          message:
            'The Expense Type selected is Inactive. New Expenses can not be created with an Inactive Expense Type'
        };
        throw err;
      }
      this._isPurchaseWithinRange(expenseType, expense.purchaseDate);
      budgets = await this.budgetDynamo.queryWithTwoIndexesInDB(expense.userId, expense.expenseTypeId);
      budget = await this._getBudgetData(budgets, expenseType, employee, expense);
    } catch (err) {
      console.error('Error Code: ' + err.code);
      throw err;
    }

    return this.checkValidity(expense, expenseType, budget, employee)
      .then(() => this._decideIfBudgetExists(budget, expense, expenseType))
      .then(() => this.expenseDynamo.addToDB(expense))
      .catch(err => {
        throw err;
      });
  }

  async _getBudgetData(budgets, expenseType, employee, expense) {
    if (_.isEmpty(budgets)) {
      return await this._createNewBudget(expenseType, employee, this.getUUID());
    } else {
      return await this._findBudgetWithMatchingRange(budgets, expense.purchaseDate);
    }
  }

  getUUID() {
    return uuid();
  }

  async _update(id, data) {
    console.warn(moment().format(), 'Expense _update', `for expense ${id}`);

    let expenseType, budget, newExpense, employee, oldExpense, rawBudgets;
    var budgets = [];
    newExpense = new Expense(data);
    newExpense.id = id;

    try {
      oldExpense = new Expense(await this.expenseDynamo.findObjectInDB(id));
      employee = new Employee(await this.employeeDynamo.findObjectInDB(newExpense.userId));
      expenseType = new ExpenseType(await this.expenseTypeDynamo.findObjectInDB(newExpense.expenseTypeId));
      if (expenseType.isInactive && employee.employeeRole === 'user') {
        let err = {
          code: 403,
          message: 'Permission Denied. Users can not edit Expenses with an Inactive Expense Type'
        };
        throw err;
      }
      rawBudgets = await this.budgetDynamo.queryWithTwoIndexesInDB(newExpense.userId, newExpense.expenseTypeId);
      rawBudgets.forEach(function(e) {
        budgets.push(new Budget(e));
      });
      budget = new Budget(this._findBudgetWithMatchingRange(budgets, oldExpense.purchaseDate));
    } catch (err) {
      console.error('Error Code: ' + err.code);
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

    let expenseTypeValid, err, startDate, endDate, validDateRange, balanceCheck;

    startDate = expenseType.recurringFlag ? budget.fiscalStartDate : expenseType.startDate;
    endDate = expenseType.recurringFlag ? budget.fiscalEndDate : expenseType.endDate;
    validDateRange = this._checkExpenseDate(expense.purchaseDate, startDate, endDate);
    balanceCheck = this._checkBalance(expense, expenseType, budget, oldExpense);
    expenseTypeValid = this._areExpenseTypesEqual(expense, oldExpense);

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

  _areExpenseTypesEqual(expense, oldExpense) {
    if (expense && oldExpense) {
      return expense.expenseTypeId === oldExpense.expenseTypeId;
    } else {
      return true; //this is a new expense
    }
  }

  _checkBalance(expense, expenseType, budget, oldExpense) {
    expense.cost = Number(expense.cost);
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

    let sum = Number((budget.pendingAmount + budget.reimbursedAmount + expense.cost - oldCost).toFixed(2));
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

  // TBD - duplicated from employee routes
  _getBudgetDates(hireDate) {
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

  _createNewBudget(expenseType, employee, newId) {
    console.warn('Expense _createNewBudget');
    const newBudget = {
      id: newId,
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
    //if the budget does exist, add the cost of this expense to the pending balance of that budget
    if (budget) {
      budget = this._addExpenseToBudget(expense, budget);
      return this.budgetDynamo.updateEntryInDB(budget);
    } else {
      let newBudget = {
        id: this.getUUID(),
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
      budget = this._budgetUpdateForReimbursedExpense(oldExpense, newExpense, budget, budgets, expenseType);
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

  _budgetUpdateForReimbursedExpense(oldExpense, newExpense, budget, budgets, expenseType) {
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

    return budget;
  }
  _removeFromBudget(budget, expense, expenseType) {
    budget.pendingAmount -= expense.cost;
    if (!budget.pendingAmount && !budget.reimbursedAmount && !expenseType.recurringFlag) {
      return this.budgetDynamo.removeFromDB(budget.id);
    } else {
      return this.budgetDynamo.updateEntryInDB(budget);
    }
  }

  _isPurchaseWithinRange(expenseType, purchaseDate) {
    if (expenseType.recurringFlag) {
      return true;
    } else if (expenseType.startDate && purchaseDate < expenseType.startDate) {
      throw {
        code: 403,
        message:
          `Purchase date must be between ${expenseType.startDate} and ${expenseType.endDate}. ` +
          'Select a later purchase date'
      };
    } else if (expenseType.endDate && expenseType.endDate < purchaseDate) {
      throw {
        code: 403,
        message:
          `Purchase date must be between ${expenseType.startDate} and ${expenseType.endDate}. ` +
          'Select an earlier purchase date'
      };
    } else {
      return true;
    }
  }

  _findBudgetWithMatchingRange(budgets, purchaseDate) {
    console.warn('here at budget', budgets);

    let validBudgets = _.find(budgets, budget =>
      this._checkExpenseDate(purchaseDate, budget.fiscalStartDate, budget.fiscalEndDate)
    );
    if (validBudgets) {
      return validBudgets;
    } else {
      let err = {
        code: 403,
        message: 'Purchase Date is out of the anniversary budget range'
      };
      throw err;
    }
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
