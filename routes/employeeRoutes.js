const Crud = require('./crudRoutes');

const databaseModify = require('../js/databaseModify');

const moment = require('moment');
const _ = require('lodash');
const uuid = require('uuid/v4');

const Employee = require('./../models/employee');

class EmployeeRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = new databaseModify('employees');
    this.budgetDynamo = new databaseModify('budgets');
    this.expenseTypeDynamo = new databaseModify('expense-types');
    this.expenseData = new databaseModify('expenses');
  }

  async _add(id, data) {
    console.warn(
      `[${moment().format()}]`,
      `>>> Attempting to add employee ${id}`,
      '| Processing handled by function employeeRoutes._add'
    );

    let employee = new Employee(data);
    employee.id = id;
    employee.isInactive = false;

    try {
      let error = await this._isDuplicateEmployee(employee);
      if (error) {
        throw error;
      }
      return this._createRecurringExpenses(employee.id, employee.hireDate).then(() => {
        return employee;
      });
    } catch (err) {
      console.error('Error Code: ' + err.code);
      throw err;
    }
  }

  async _createRecurringExpenses(userId, hireDate) {
    console.warn(
      `[${moment().format()}]`,
      `Creating recurring expenses for user ${userId} starting on ${hireDate}`,
      '| Processing handled by function employeeRoutes._createRecurringExpenses'
    );

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
        id: this._getUUID(),
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

  async _delete(id) {
    console.warn(
      `[${moment().format()}]`,
      `>>> Attempting to delete employee ${id}`,
      '| Processing handled by function employeeRoutes._delete'
    );

    let employee, userExpenses, userBudgets;

    try {
      userExpenses = await this.expenseData.querySecondaryIndexInDB('userId-index', 'userId', id);

      //can only delete a user if they have no expenses
      if (userExpenses.length === 0) {
        employee = new Employee(await this.databaseModify.removeFromDB(id));
        userBudgets = await this.budgetDynamo.querySecondaryIndexInDB('userId-expenseTypeId-index', 'userId', id);
        for (let budget of userBudgets) {
          await this.budgetDynamo.removeFromDB(budget.id); //deletes all users empty budgets
        }
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
  }

  _getBudgetDates(hireDate) {
    console.warn(
      `[${moment().format()}]`,
      `Getting budget dates for ${hireDate}`,
      '| Processing handled by function employeeRoutes._getBudgetDates'
    );

    let anniversaryMonth = moment(hireDate, 'YYYY-MM-DD').month(); // form 0-11
    let anniversaryDay = moment(hireDate, 'YYYY-MM-DD').date(); // from 1 to 31
    let anniversaryYear = moment(hireDate, 'YYYY-MM-DD').year();
    const anniversaryComparisonDate = moment([anniversaryYear, anniversaryMonth, anniversaryDay]);
    let startYear;
    const today = moment();

    if (anniversaryComparisonDate.isBefore(today)) {
      startYear = today.isBefore(moment([today.year(), anniversaryMonth, anniversaryDay]))
        ? today.year() - 1
        : today.year();

    } else {
      startYear = anniversaryYear;
    }

    let startDate = moment([startYear, anniversaryMonth, anniversaryDay]);
    let endDate = moment([startYear, anniversaryMonth, anniversaryDay])
      .add('1', 'years')
      .subtract('1', 'days');

    return {
      startDate,
      endDate
    };
  }

  _getUUID() {
    return uuid();
  }

  // TODO: write test for this function. Should throw error not return it.
  /**
   * Returns error code if an employee number or email is within the employee database. Return false if not.
   */
  async _isDuplicateEmployee(employee) {
    console.warn(
      `[${moment().format()}]`,
      `Checking if user ${employee.id} is a duplicate employee`,
      '| Processing handled by function employeeRoutes._isDuplicateEmployee'
    );
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
    console.warn(
      `[${moment().format()}]`,
      `>>> Attempting to update user ${id}`,
      '| Processing handled by function employeeRoutes._update'
    );

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
}

module.exports = EmployeeRoutes;
