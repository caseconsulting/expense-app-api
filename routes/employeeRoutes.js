const Crud = require('./crudRoutes');

const databaseModify = require('../js/databaseModify');
const employeeDynamo = new databaseModify('employees');
const budgetDynamo = new databaseModify('budgets'); //added
const expenseDynamo = new databaseModify('expenses');

const moment = require('moment');
const _ = require('lodash');
const uuid = require('uuid/v4');

const Employee = require('./../models/employee');
const Budget = require('./../models/budget');

class EmployeeRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = employeeDynamo;
    this.budgetDynamo = new databaseModify('budgets');
    this.expenseTypeDynamo = new databaseModify('expense-types');
<<<<<<< HEAD
  }

  async _delete(id) {
    console.warn(moment().format(), 'Employee _delete', `for employee ${id}`);

    let employee, userExpenses;

    try {
      userExpenses = await this.expenseData.querySecondaryIndexInDB('userId-index', 'userId', id);

      //can only delete a user if they have no budget data
      if (userExpenses.length === 0) {
        employee = new Employee(await this.databaseModify.removeFromDB(id));
        return employee;
      } else {
        let err = {
          code: 403,
          message: 'Employee can not be deleted if they have expenses'
        };
        throw err;
      }
    } catch (err) {
      console.error('Error Code: ' + err.code);
      throw err;
    }
=======
>>>>>>> refactored spec for _createRecurringExpenses in employeeRoutes
  }

  async _add(id, data) {
    console.warn(moment().format(), 'Employee _add', `for employee ${id}`);

    let employee = new Employee(data);
    employee.id = id;
    employee.isActive = true;

    try {
      let error = await this._isDuplicateEmployee(employee);
      if (error) {
        throw error;
      }
      return this._createRecurringExpenses(uuid, employee.hireDate).then(() => {
        return employee;
      });
    } catch (err) {
      console.error('Error Code: ' + err.code);
      throw err;
    }
  }

  /**
   * Returns error code if an employee number or email is within the employee database. Return false if not.
   */
  async _isDuplicateEmployee(employee) {
    let allEmployees = await this.databaseModify.getAllEntriesInDB();
    if (allEmployees.some(e => e.employeeNumber === employee.employeeNumber)) {
      let err = {
        code: 403,
        message: 'Employee number already taken. Please enter a new Employee number'
      };
      return err;
    }

    if (allEmployees.some(e => e.email === employee.email)) {
      let err = {
        code: 403,
        message: 'Employee email already taken. Please enter a new email'
      };
      return err;
    }
    return false;
  }

  _update(id, data) {
    console.warn(moment().format(), 'Employee _update', `for employee ${id}`);

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
    let dates = this._getBudgetDates(hireDate);
    let expenseTypeList;
    //get all recurring expenseTypes
    try {
      expenseTypeList = await this.expenseTypeDynamo.getAllEntriesInDB();
    } catch (err) {
      console.error('Error Code: ' + err.code);
      throw err;
    }
    expenseTypeList = _.filter(expenseTypeList, exp => exp.recurringFlag);
    return _.forEach(expenseTypeList, recurringExpenseType => {
      let newBudget = {
        id: this.getUUID(),
        expenseTypeId: recurringExpenseType.id,
        userId: userId,
        reimbursedAmount: 0,
        pendingAmount: 0,
        fiscalStartDate: dates.startDate.format('YYYY-MM-DD'),
        fiscalEndDate: dates.endDate.format('YYYY-MM-DD')
      };
      return this.budgetDynamo.addToDB(newBudget).then(() => {
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
  getUUID() {
    return uuid();
  }
}

module.exports = EmployeeRoutes;
