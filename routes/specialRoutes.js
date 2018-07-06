const express = require('express');
const _ = require('lodash');
const uuid = require('uuid/v4');

class Special {
  constructor(expenseData, employeeData, expenseTypeData) {
    this.expenseData = expenseData;
    this.employeeData = employeeData;
    this.expenseTypeData = expenseTypeData;
    this._router = express.Router();
    this._router.get('/', this.showList.bind(this));
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


  // showList(req, res) {
  //   Promise.all(this.expenseData.getAllEntriesInDB())
  //     .then(([expense]) => {
  //
  //       let processedExpenses = _.map(expense, expense => {
  //         this.expenseTypeData.findObjectInDB(expense.userId)
  //           .then(data => {
  //             expense.employeeName = `${data.firstName} ${data.middleName} ${data.lastName}`;
  //             expense.selected = false;
  //           });
  //       });
  //
  //       processedExpenses = _.map(expense, expense => {
  //         this.expenseTypeData.findObjectInDB(expense.expenseTypeId)
  //           .then(data => expense.budgetName = data.budgetName);
  //       });
  //
  //       res.status(200).send(processedExpenses);
  //     });
  // });




  //res.status(200).send(this.empBudgets);
  // .getAllEntriesInDB()
  // .then(data => res.status(200).send(data))
  // .catch(err => this._handleError(res, err));
}

module.exports = Special;