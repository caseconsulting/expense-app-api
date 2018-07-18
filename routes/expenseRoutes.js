const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const employeeDynamo = new databaseModify('Employee');
const expenseTypeDynamo = new databaseModify('ExpenseType');
const _ = require('lodash');

class ExpenseRoutes extends Crud {
  constructor(databaseModify, uuid) {
    super(databaseModify, uuid);
    this.databaseModify = databaseModify;
    this.employeeDynamo = employeeDynamo;
    this.expenseTypeDynamo = expenseTypeDynamo;
  }

  _delete(id) {
    return this.databaseModify
      .findObjectInDB(id)
      .then(expense => this.deleteCostFromBudget(expense.expenseTypeId, expense.userId, expense.cost))
      .catch(err => {
        throw err;
      });
  }

  _add(uuid, {
    purchaseDate,
    reimbursedDate,
    cost,
    description,
    note,
    receipt,
    expenseTypeId,
    userId,
    createdAt
  }) {
    return this.validateCostToBudget(expenseTypeId, userId, cost)
      .then(() => {
        return {
          id: uuid,
          purchaseDate,
          reimbursedDate,
          cost,
          description,
          note,
          receipt,
          expenseTypeId,
          userId,
          createdAt
        };
      })
      .catch(err => {
        throw err;
      });
  }

  /**
   * Removes the previous information from the database, including from employee's
   *  balance
   * adds the new information
   */
  _update(id, {
    purchaseDate,
    reimbursedDate,
    cost,
    description,
    note,
    receipt,
    expenseTypeId,
    userId,
    createdAt
  }) {
    return this.databaseModify
      .findObjectInDB(id)
      .then(expense => this.deleteCostFromBudget(expense.expenseTypeId, expense.userId, expense.cost))
      .then(() => this.validateCostToBudget(expenseTypeId, userId, cost))
      .then(() => {
        return {
          id,
          purchaseDate,
          reimbursedDate,
          cost,
          description,
          note,
          receipt,
          expenseTypeId,
          userId,
          createdAt
        };
      })
      .catch(err => {
        throw err;
      });
  }

  createNewBalance(employee) {
    if (!employee.expenseTypes) {
      //create new balance under the employee
      employee.expenseTypes = [];
      return this.employeeDynamo.updateEntryInDB(employee);
    }
  }

  _isCoveredByOverdraft(expenseType, employeeBalance) {
    return 2 * expenseType.budget - employeeBalance > 0 && expenseType.odFlag;
  }
  _isPartiallyCoveredByOverdraftIfYoureReadingThisThenIAmVerySorry(expenseType, employeeBalance) {
    return 2 * expenseType.budget - employeeBalance < 0 && expenseType.odFlag;
  }

  _addPartialCoverageByOverdraftBlessYourSoulChild(employee, expenseType, budgetPosition, cost) {
    let remaining = cost + employee.expenseTypes[budgetPosition].balance - 2 * expenseType.budget;
    employee.expenseTypes[budgetPosition].balance = 2 * expenseType.budget;
    employee.expenseTypes[budgetPosition].owedAmount = remaining;
    return this.employeeDynamo.updateEntryInDB(employee);
  }

  _isPartiallyCovered(expenseType, employee, budgetPosition, remaining, employeeBalance) {
    return (
      expenseType.budget !== employee.expenseTypes[budgetPosition].balance &&
      expenseType.budget - employeeBalance < 0 &&
      !expenseType.odFlag &&
      remaining < 0
    );
  }

  _isCovered(expenseType, employeeBalance) {
    return expenseType.budget - employeeBalance >= 0;
  }

  _initializeNewBudget(expenseType, employee, cost) {
    let newExpense;
    if (cost <= expenseType.budget) {
      //The cost of the expense is enough to be covered by the budget
      newExpense = {
        id: expenseType.id,
        balance: cost,
        owedAmount: 0
      };
    } else if (cost > expenseType.budget && !expenseType.odFlag) {
      //The cost is greater than the budget, therefore
      // it is only partially covered and the remaining amount
      //  that is NOT reimbursed under this expense type is set to owedAmount
      newExpense = {
        id: expenseType.id,
        balance: expenseType.budget,
        owedAmount: cost - expenseType.budget
      };
    } else if (cost <= 2 * expenseType.budget && expenseType.odFlag) {
      //The cost of the expense is enough to be covered by the budget
      //Since the overdraft flag is true
      newExpense = {
        id: expenseType.id,
        balance: cost,
        owedAmount: 0
      };
    } else if (cost > 2 * expenseType.budget && !expenseType.odFlag) {
      newExpense = {
        id: expenseType.id,
        balance: 2 * expenseType.budget,
        owedAmount: cost - 2 * expenseType.budget
      };
    }
    employee.expenseTypes.push(newExpense);
    // Created new budget under employee
    return this.employeeDynamo.updateEntryInDB(employee);
  }

  _addToOverdraftCoverage(employee, budgetPosition, employeeBalance) {
    employee.expenseTypes[budgetPosition].balance = employeeBalance;
    return this.employeeDynamo.updateEntryInDB(employee);
  }

  _addPartialCoverage(employee, expenseType, budgetPosition, remaining) {
    employee.expenseTypes[budgetPosition].balance = expenseType.budget;
    employee.expenseTypes[budgetPosition].owedAmount = Math.abs(remaining);
    return this.employeeDynamo.updateEntryInDB(employee);
  }

  _addToBudget(employee, budgetPosition, employeeBalance) {
    employee.expenseTypes[budgetPosition].balance = employeeBalance;
    return this.employeeDynamo.updateEntryInDB(employee);
  }

  /**
   * Finds the appropriate budget operations to perfom depending on
   * expenseType's budget amount, employee's balance and cost of expense
   */
  performBudgetOperation(employee, expenseType, cost) {
    let employeeBalance;
    let budgetPosition = _.findIndex(employee.expenseTypes, element => {
      return element.id === expenseType.id;
    });
    if (budgetPosition === -1) {
      //employee does not yet have an expense for this expense type
      employeeBalance = 0;
    } else {
      employeeBalance = employee.expenseTypes[budgetPosition].balance + cost;
    }
    let remaining = expenseType.budget - employeeBalance;
    let err = {
      code: 406,
      message: `expense over budget limit: ${Math.abs(remaining)}`
    };
    if (!employeeBalance) {
      return this._initializeNewBudget(expenseType, employee, cost);
    } else if (this._isCoveredByOverdraft(expenseType, employeeBalance)) {
      return this._addToOverdraftCoverage(employee, budgetPosition, employeeBalance);
    } else if (this._isPartiallyCoveredByOverdraftIfYoureReadingThisThenIAmVerySorry(expenseType, employeeBalance)) {
      return this._addPartialCoverageByOverdraftBlessYourSoulChild(employee, expenseType, budgetPosition, cost);
    } else if (this._isPartiallyCovered(expenseType, employee, budgetPosition, remaining, employeeBalance)) {
      return this._addPartialCoverage(employee, expenseType, budgetPosition, remaining);
    } else if (this._isCovered(expenseType, employeeBalance)) {
      return this._addToBudget(employee, budgetPosition, employeeBalance);
    } else {
      return Promise.reject(err);
    }
  }

  validateCostToBudget(expenseTypeId, userId, cost) {
    let expenseType, employee;
    return expenseTypeDynamo
      .findObjectInDB(expenseTypeId)
      .then(data => {
        expenseType = data;
        return employeeDynamo.findObjectInDB(userId);
      })
      .then(data => {
        employee = data;
        return this.createNewBalance(employee);
      })
      .then(() => {
        return this.performBudgetOperation(employee, expenseType, cost);
      })
      .catch(err => {
        throw err;
      });
  }

  deleteCostFromBudget(expenseTypeId, userId, cost) {
    let _findExpenseCurried = _.curry(this._findExpense)(expenseTypeId, cost);
    return employeeDynamo
      .findObjectInDB(userId)
      .then(_findExpenseCurried)
      .catch(err => {
        throw err;
      });
  }
  _findExpense(expenseTypeId, cost, employee) {
    let employeeBalance;
    for (var i = 0; i < employee.expenseTypes.length; i++) {
      if (employee.expenseTypes[i].id === expenseTypeId) {
        let budget = employee.expenseTypes[i].balance;
        employee.expenseTypes[i].balance = employee.expenseTypes[i].balance - cost;

        if(employee.expenseTypes[i].owedAmount>0){
          employee.expenseTypes[i].balance = employee.expenseTypes[i].balance + employee.expenseTypes[i].owedAmount;
          if(employee.expenseTypes[i].balance>budget){
            let diff = employee.expenseTypes[i].balance - budget;
            employee.expenseTypes[i].owedAmount = diff;
          }
          else{
            employee.expenseTypes[i].owedAmount = 0;
          }
        }

        return employeeDynamo.updateEntryInDB(employee);
      }
    }
    if (!employeeBalance) {
      let err = {
        code: 404,
        message: 'Expense not found'
      };
      throw err;
    }
  }
}
module.exports = ExpenseRoutes;
