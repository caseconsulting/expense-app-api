const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const moment = require('moment');
const _ = require('lodash');
const uuid = require('uuid/v4');
const Util = require('../js/Util');
const util = new Util('employeeRoutes');
const Employee = require('./../models/employee');
const IsoFormat = 'YYYY-MM-DD';

class EmployeeRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = new databaseModify('employees');
    this.budgetDynamo = new databaseModify('budgets');
    this.expenseTypeDynamo = new databaseModify('expense-types');
    this.expenseData = new databaseModify('expenses');
  }

  async _add(id, data) {
    util.log(1, '_add', `Attempting to add employee ${id}`);

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
      util.log(1, '_add', `Failed to add employee ${id}`);
      util.error('_add', `Error code: ${err.code}`);
      throw err;
    }
  }

  /**
   * Change budgets when hiring date changes
   */
  async _changeBudgetDates(oldEmployeePromise, newEmployee) {
    let oldEmployee = await oldEmployeePromise;

    util.log(2, '_changeBudgetDates',
      `Attempting to Change Hire Date for user ${oldEmployee.id} from ${oldEmployee.hireDate}`,
      `to ${newEmployee.hireDate}`
    );

    // if hire date is not changed, resolve promise
    if (oldEmployee.hireDate === newEmployee.hireDate) {
      return Promise.resolve(newEmployee);
    }
    try {
      // get all expense types
      this.getExpenseTypes().then( expenseTypes => {
        // filter out non recurring expense types
        let recurringExpenseTypes = _.filter(expenseTypes, ['recurringFlag', true]);
        // for each expense type
        recurringExpenseTypes.forEach( expenseType => {
          // get all budgets
          this.getBudgets(oldEmployee.id, expenseType.id).then( budgets => {
            // sort budgets
            let sortedBudgets = this._sortBudgets(budgets);
            // loop through sorted budgets and update fiscal start and end date
            for (let i = 0; i < sortedBudgets.length; i++)
            {
              let newBudget = sortedBudgets[i];
              newBudget.fiscalStartDate = moment(newEmployee.hireDate)
                .add(i, 'years')
                .format(IsoFormat);
              newBudget.fiscalEndDate = moment(newEmployee.hireDate)
                .add(i + 1, 'years')
                .subtract(1, 'days')
                .format(IsoFormat);
              this.budgetDynamo.updateEntryInDB(newBudget).catch(err => { throw err; });
            }
          });
        });
      });
    } catch (err) {
      throw Promise.reject(err);
    }
    return Promise.resolve(newEmployee);
  }

  async _createRecurringExpenses(userId, hireDate) {
    util.log(2, '_createRecurringExpenses',
      `Creating recurring expenses for user ${userId} starting on ${hireDate}`
    );

    let dates = this._getBudgetDates(hireDate);
    let expenseTypeList;
    //get all recurring expenseTypes
    try {
      expenseTypeList = await this.expenseTypeDynamo.getAllEntriesInDB();
    } catch (err) {
      util.error('_createRecurringExpenses', `Error code: ${err.code}`);

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
    util.log(1, '_delete', `Attempting to delete employee ${id}`);

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
      util.error('_delete', `Error code: ${err.code}`);

      throw err;
    }
  }

  _getBudgetDates(hireDate) {
    util.log(2, '_getBudgetDates', `Getting budget dates for ${hireDate}`);

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

  /**
   * Get all budgets for an employee with a specific expense type.
   */
  async getBudgets(employeeID, expenseTypeID) {
    util.log(3, 'getBudgets', `Getting budgets for employee ${employeeID} with expense type ${expenseTypeID}`);

    return await this.budgetDynamo.queryWithTwoIndexesInDB(employeeID, expenseTypeID);
  }

  /**
   * Get all expense types.
   */
  async getExpenseTypes() {
    util.log(2, 'getExpenseTypes', 'Getting all expense types');

    return await this.expenseTypeDynamo.getAllEntriesInDB();
  }

  _getUUID() {
    util.log(4, '_getUUID', 'Getting random uuid');

    return uuid();
  }

  // TODO: write test for this function. Should throw error not return it.
  /**
   * Returns error code if an employee number or email is within the employee database. Return false if not.
   */
  async _isDuplicateEmployee(employee) {
    util.log(2, '_isDuplicateEmployee', `Checking if user ${employee.id} is a duplicate employee`);

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

  /*
   * Return an array of sorted budgets by fiscal start date
   */
  _sortBudgets(budgets) {
    util.log(3, '_sortBudgets', 'Sorting budgets');

    return _.sortBy(budgets, [
      budget => {
        return moment(budget.fiscalStartDate, IsoFormat);
      }
    ]);
  }

  _update(id, data) {
    util.log(1, '_update', `Attempting to update user ${id}`);

    let employee = new Employee(data);
    employee.id = id;

    let oldEmployee = this.databaseModify.findObjectInDB(id);

    return this._changeBudgetDates(oldEmployee, employee)
      .then(() => {
        return employee;
      })
      .catch(err => {
        throw err;
      });
  }
}

module.exports = EmployeeRoutes;
