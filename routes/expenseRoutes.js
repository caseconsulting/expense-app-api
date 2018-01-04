const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const _ = require('lodash');

class ExpenseRoutes extends Crud {
  constructor(databaseModify, uuid) {
    super(databaseModify, uuid);
    this.databaseModify = databaseModify;
  }

  _delete(id) {
    return this.databaseModify.findObjectInDB(id)
      .then((expense) => this.deleteCostFromBudget(expense.expenseTypeId, expense.userId, expense.cost))
      .catch((err) => {
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
      .then(function(data) {
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
      .catch((err) => {
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
    return this.databaseModify.findObjectInDB(id)
      .then((expense) => this.deleteCostFromBudget(expense.expenseTypeId, expense.userId, expense.cost))
      .then(() => this.validateCostToBudget(expenseTypeId, userId, cost))
      .then(function(data) {
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
      .catch((err) => {
        throw err
      });
  }

  createNewBalance(employeeJson, employee) {
    if (!employee.expenseTypes) {
      //create new balance under the employee
      employee.expenseTypes = [];
      return employeeJson.updateEntryInDB(employee);
    }
  }

  /**
   * Finds the appropriate budget operations to perfom depending on
   * expenseType's budget amount, employee's balance and cost of expense
   */
  performBudgetOperation(employeeJson, employee, expenseType, cost) {
    let employeeBalance;
    let budgetPosition;
    let remaining;
    for (var i = 0; i < employee.expenseTypes.length; i++) {
      if (employee.expenseTypes[i].id === expenseType.id) {
        budgetPosition = i;
        employeeBalance = +employee.expenseTypes[i].balance + cost;
        remaining = expenseType.budget - employeeBalance;
      }
    }

    if (!employeeBalance) {
      //create new balance under the employee
      let newExpense = {
        id: expenseType.id,
        balance: '' + cost,
        owedAmount: '0'
      }
      employee.expenseTypes.push(newExpense);
      console.log('Created new budget under employee');
      return employeeJson.updateEntryInDB(employee);
    }
    //OVERDRAFT
    else if (expenseType.budget - employeeBalance < 0 && expenseType.odFlag) {
      employee.expenseTypes[budgetPosition].balance = '' + employeeBalance;
      console.log('Overdraft');
      return employeeJson.updateEntryInDB(employee);
    }
    //PARTIAL COVERAGE
    else if (expenseType.budget !== +employee.expenseTypes[budgetPosition].balance && expenseType.budget - employeeBalance < 0 && !expenseType.odFlag && remaining < 0) {
      employee.expenseTypes[budgetPosition].balance = '' + expenseType.budget;
      employee.expenseTypes[budgetPosition].owedAmount = '' + Math.abs(remaining);
      console.log('Partial Coverage');
      return employeeJson.updateEntryInDB(employee);
    }
    //COVERED BY BUDGET
    else if (expenseType.budget - employeeBalance >= 0) {
      employee.expenseTypes[budgetPosition].balance = '' + employeeBalance;
      console.log('Covered by budget');
      return employeeJson.updateEntryInDB(employee);
    } else {
      let err = {
        code: 406,
        message: `expense over budget limit: ${Math.abs(remaining)}`
      };
      return Promise.reject(err);
    }
  }

  //TODO use rocket functions to replace curried functions
  validateCostToBudget(expenseTypeId, userId, cost) {
    let expenseType;
    let employee;

    const expenseTypeJson = new databaseModify('expenseType.json');
    const employeeJson = new databaseModify('employee.json');
    let createNewBalanceCurried = _.curry(this.createNewBalance)(employeeJson);
    let performBudgetOperationCurried = _.curry(this.performBudgetOperation)(employeeJson);

    return expenseTypeJson.findObjectInDB(expenseTypeId)
      .then(function(data) {
        expenseType = data;
        return employeeJson.findObjectInDB(userId);
      })
      .then(function(data) {
        employee = data;
        return createNewBalanceCurried(employee);
      })
      .then(function() {
        return performBudgetOperationCurried(employee, expenseType, cost);
      })
      .catch((err) => {
        throw err;
      });
  }

  deleteCostFromBudget(expenseTypeId, userId, cost) {
    const employeeJson = new databaseModify('employee.json');
    return employeeJson.findObjectInDB(userId)
      .then(function(employee) {
        let employeeBalance;
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
      })
      .catch((err) => {
        throw err;
      });
  }
}
module.exports = ExpenseRoutes;