/*jshint esversion: 6 */

const express = require('express');
const _ = require('lodash');

class Special {
  constructor(expenseData, employeeData, expenseTypeData) {
    this.expenseData = expenseData;
    this.employeeData = employeeData;
    this.expenseTypeData = expenseTypeData;
    this._router = express.Router();
    this._router.get('/', this.showList.bind(this));
    this._router.get('/:id', this.empExpenses.bind(this));
  }

  get router() {
    return this._router;
  }

  /**
   * Handles any errors in crud operations
   */
  _handleError(res, err) {
    const logColor = '\x1b[31m';
    const resetColor = '\x1b[0m';
    console.error(logColor, 'Error Code: ' + err.code);
    console.error(logColor, 'Error Message: ' + err.message);
    console.error(resetColor);
    return res.status(err.code).send(err.message);
  }

  getEmployeeName(expense) {
    //console.log(expense.userId);
    return this.employeeData.readFromDB(expense.userId)
      .then(employee => {
        let emp = employee[0];
        expense.employeeName = `${emp.firstName} ${emp.middleName} ${
          emp.lastName}`;
        return expense;
      });
  }


  getExpenseTypeName(expense) {
    return this.expenseTypeData.readFromDB(expense.expenseTypeId)
      .then(expenseType => {
        let type = expenseType[0];
        expense.budgetName = type.budgetName;
        return expense;
      });
  }

  showList(req, res) {
    return this.expenseData.getAllEntriesInDB()
      .then(values => this._processExpenses(values))
      .then(returnValue => {
        res.status(200).send(returnValue);
      });
  }

  async empExpenses(req, res) {
    try
    {
      let userID = req.params.id;
      let expenses = await this.expenseData.getAllEntriesInDB();
      let user = await this.employeeData.readFromDB(userID);
      let expensesTypes = await this.expenseTypeData.getAllEntriesInDB();
      let returnObject = this._findEmployee(expenses, user[0], expensesTypes);
      //console.log('\n', expenses,'\n');
      res.status(200).send(returnObject);
    }
    catch(error)
    {
      this._handleError(res, error);
    }
  }

  _findEmployee(expenses, user, expensesTypes)
  {
    let filteredExpenses = _.filter(expenses, (expense) => expense.userId === user.id);
    expensesTypes.expenses = [];
    let temp = _.forEach(expensesTypes, (type) => {
      type.expenses = [];
      _.forEach(filteredExpenses, expense => {
        if (type.id === expense.expenseTypeId)
        {
          type.expenses.push(expense);
        }
      });
      return type;
    });
    //console.log(filteredExpenses);
    return {
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      expenses: temp
    };
  }

  _processExpenses(expenseData) {
    let processedExpenses = [];
    return new Promise((resolve) => {
      processedExpenses = _.map(expenseData, expense => {
        return this.getEmployeeName(expense);
      });
      //console.log(typeof processedExpenses);
      processedExpenses = _.map(expenseData, expense => {
        return this.getExpenseTypeName(expense);
      });
      resolve(
        Promise.all(processedExpenses).then((values) => {
          return values;
        })
      );
    });
  }
}


module.exports = Special;
