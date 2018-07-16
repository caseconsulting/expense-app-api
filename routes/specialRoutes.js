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


  showList(req, res) {
    let processedExpenses = [];

    Promise.all([this.employeeData.getAllEntriesInDB(),
        this.expenseTypeData.getAllEntriesInDB(), this.expenseData.getAllEntriesInDB()
      ])
      .then(values => {
        let employees = values[0];
        let expenseTypes = values[1];
        let expenseData = values[2];

        // employees = employees.map(employee => {
        //   return {
        //     text: `${employee.firstName} ${employee.middleName} ${
        //       employee.lastName
        //     }`,
        //     value: employee.id
        //   };
        // });
        //
        // expenseTypes = expenseTypes.map(expenseType => {
        //   return {
        //     text: expenseType.budgetName,
        //     value: expenseType.id
        //   };
        // });
        //
        // processedExpenses = _.map(expenseData, expense => {
        //   return this.employeeData.readFromDB(expense.userId)
        //     .then(employee => {
        //       expense.employeeName = `${employee.firstName} ${employee.middleName} ${
        //         employee.lastName
        //       }`;
        //     })
        // });

        // processedExpenses = _.map(expenseData, expense => {
        //   return this.expenseTypeData.readFromDB(expense.userId)
        //     .then(expenseType => {
        //       api.EXPENSE_TYPES,
        //         expense.expenseTypeId
        //       expense.budgetName = expenseType.budgetName;
        //     })
        // });
        Promise.all([processedExpenses])
          .then(data => res.status(200).send(employees))
          .catch(err => this._handleError(res, err));
      })
  }
}


module.exports = Special;