const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const employeeDynamo = new databaseModify('employees');
const moment = require('moment');
const _ = require('lodash');
const uuid = require('uuid/v4');

const Employee = require('./../models/employee');

class EmployeeRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = employeeDynamo;
  }

  _add(uuid, data) {
    let employee = new Employee(data);
    employee.id = uuid;

    return this._createRecurringExpenses(uuid, employee.hireDate).then(() => {
      return employee;
    });
  }

  _update(id, data) {
    let employee = new Employee(data);
    employee.id = id;

    return this.databaseModify
      .findObjectInDB(id)
      .then(() => {
        return employee;
      })
      .catch(err => {
        throw err;
      });
  }

  async _createRecurringExpenses(userId, hireDate) {
    const budgetDynamo = new databaseModify('budgets');
    const expenseTypeDynamo = new databaseModify('expense-types');

    let dates = this._getBudgetDates(hireDate);
    let expenseTypeList;
    //get all recurring expenseTypes
    try {
      expenseTypeList = await expenseTypeDynamo.getAllEntriesInDB();
    } catch (err) {
      throw err;
    }
    expenseTypeList = _.filter(expenseTypeList, exp => exp.recurringFlag);
    return _.forEach(expenseTypeList, recurringExpenseType => {
      let newBudget = {
        id: uuid(),
        expenseTypeId: recurringExpenseType.id,
        userId: userId,
        reimbursedAmount: 0,
        pendingAmount: 0,
        fiscalStartDate: dates.startDate.format('YYYY-MM-DD'),
        fiscalEndDate: dates.endDate.format('YYYY-MM-DD')
      };
      return budgetDynamo.addToDB(newBudget).then(() => {
        return; //tell forEach to continue looping
      });
    });

    // return Promise.resolve();
    //for each recurring expense type in the list
    //create a budget using the userId and the expenseTypeId
  }

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
}

module.exports = EmployeeRoutes;
