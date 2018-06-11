const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const employeeJson = new databaseModify('employee.json');
const expenseTypeJson = new databaseModify('expenseType.json');
const _ = require('lodash');
// TODO: change employeeJson to Dynamo table since it is not a json file
class ExpenseRoutes extends Crud {
  constructor(databaseModify, uuid) {
    super(databaseModify, uuid);
    this.databaseModify = databaseModify;
    this.employeeJson = employeeJson;
    this.expenseTypeJson = expenseTypeJson;
  }

  _delete(id) {
    return this.databaseModify
      .findObjectInDB(id)
      .then(expense => this.deleteCostFromBudget(expense.expenseTypeId, expense.userId, expense.cost))
      .catch(err => {
        throw err;
      });
  }

  _add(uuid, { purchaseDate, reimbursedDate, cost, description, note, receipt, expenseTypeId, userId, createdAt }) {
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
  _update(id, { purchaseDate, reimbursedDate, cost, description, note, receipt, expenseTypeId, userId, createdAt }) {
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
      return this.employeeJson.updateEntryInDB(employee);
    }
  }

  _isCoveredByOverdraft(expenseType, employeeBalance) {
    return expenseType.budget - employeeBalance < 0 && expenseType.odFlag;
  }

  _isPartiallyCovered(expenseType, employee, budgetPosition, remaining, employeeBalance) {
    return expenseType.budget !== +employee.expenseTypes[budgetPosition].balance &&
  expenseType.budget - employeeBalance < 0 &&
  !expenseType.odFlag &&
  remaining < 0;
  }

  _isCovered(expenseType, employeeBalance) {
    return expenseType.budget - employeeBalance >= 0;
  }

  _initializeNewBudget(expenseType, employee, cost) {
    let newExpense = {
      id: expenseType.id,
      balance: '' + cost,
      owedAmount: '0'
    };
    employee.expenseTypes.push(newExpense);
    // Created new budget under employee
    return this.employeeJson.updateEntryInDB(employee);
  }

  _addToOverdraftCoverage(employee, budgetPosition, employeeBalance) {
    employee.expenseTypes[budgetPosition].balance = '' + employeeBalance;
    return this.employeeJson.updateEntryInDB(employee);
  }

  _addPartialCoverage(employee, expenseType, budgetPosition, remaining) {
    employee.expenseTypes[budgetPosition].balance = '' + expenseType.budget;
    employee.expenseTypes[budgetPosition].owedAmount = '' + Math.abs(remaining);
    return this.employeeJson.updateEntryInDB(employee);
  }

  _addToBudget(employee, budgetPosition, employeeBalance) {
    employee.expenseTypes[budgetPosition].balance = '' + employeeBalance;
    return this.employeeJson.updateEntryInDB(employee);
  }


  /**
   * Finds the appropriate budget operations to perfom depending on
   * expenseType's budget amount, employee's balance and cost of expense
   */
  performBudgetOperation(employee, expenseType, cost) {
    let employeeBalance;
    let budgetPosition = _.findIndex(employee.expenseTypes, (element) => {

      return element.id === expenseType.id;
    });
    if(budgetPosition === -1){
      employeeBalance = 0;
    }
    else{
      employeeBalance = +employee.expenseTypes[budgetPosition].balance + cost;
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
    } else if (this._isPartiallyCovered(expenseType, employee, budgetPosition, remaining, employeeBalance)) {
      return this._addPartialCoverage(employee, expenseType, budgetPosition, remaining);
    } else if (this._isCovered(expenseType, employeeBalance)) {
      return this._addToBudget(employee, budgetPosition, employeeBalance);
    } else{
      return Promise.reject(err);
    }
  }

  validateCostToBudget(expenseTypeId, userId, cost) {
    let expenseType, employee;
    return expenseTypeJson
      .findObjectInDB(expenseTypeId)
      .then(data => {
        expenseType = data;
        return employeeJson.findObjectInDB(userId);
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
    let _findExpenseCurried = _.curry(this._findExpense)(expenseTypeId,cost);
    return employeeJson
      .findObjectInDB(userId)
      .then(_findExpenseCurried)
      .catch(err => {
        throw err;
      });
  }
  _findExpense(expenseTypeId, cost, employee){
    let employeeBalance;
    // TODO: convert to lodash
    for (var i = 0; i < employee.expenseTypes.length; i++) {
      if (employee.expenseTypes[i].id === expenseTypeId) {
        employeeBalance = +employee.expenseTypes[i].balance - cost;
        employee.expenseTypes[i].balance = '' + employeeBalance;
        return employeeJson.updateEntryInDB(employee);
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
