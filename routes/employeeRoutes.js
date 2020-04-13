const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const moment = require('moment');
const _ = require('lodash');
const uuid = require('uuid/v4');
const Logger = require('../js/Logger');
const logger = new Logger('employeeRoutes');
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
    logger.log(1, '_add', `Attempting to add employee ${id}`);

    let employee = new Employee(data);
    employee.id = id;

    try {
      let error = await this._isDuplicateEmployee(employee);
      if (error) {
        throw error;
      }
      return this._createCurrentBudgets(employee).then(() => {
        return employee;
      });
    } catch (err) {
      logger.log(1, '_add', `Failed to add employee ${id}`);
      logger.error('_add', `Error code: ${err.code}`);
      throw err;
    }
  }

  _adjustedBudget(expenseType, employee) {
    return (expenseType.budget * (employee.workStatus / 100.0)).toFixed(2);
  }

  /*
   * Creates budgets for all active expense types for a given employee.
   *
   * @param employee - Employee who is getting new budgets
   */
  async _createCurrentBudgets(employee) {
    logger.log(2, '_createCurrentBudgets',
      `Creating recurring expenses for user ${employee.id} starting on ${employee.hireDate}`
    );

    let dates = this._getBudgetDates(employee.hireDate);
    let expenseTypeList;
    let startDate;
    let endDate;

    //get all expense tpes
    try {
      expenseTypeList = await this.expenseTypeDynamo.getAllEntriesInDB();
    } catch (err) {
      logger.error('_createCurrentBudgets', `Error code: ${err.code}. Failed to get all expense types`);
      throw err;
    }

    // filter for expense types active today (recurring and includes today within date range)
    expenseTypeList = _.filter(expenseTypeList, exp => {
      let start = moment(exp.startDate, IsoFormat);
      let end = moment(exp.endDate, IsoFormat);
      return exp.recurringFlag || moment().isBetween(start, end, 'day', '[]');
    });

    // create budget for each expense type
    return _.forEach(expenseTypeList, expenseType => {
      let amount;

      // get budget amount
      if (this._hasAccess(employee, expenseType)) {
        // if employee has access to the expense type, calculate the adjusted amount
        amount = this._adjustedBudget(expenseType, employee);
      } else {
        // if employee does not have access to the expense type, set the amount to 0
        amount = 0;
      }

      // get budget start and end date
      if (expenseType.recurringFlag) {
        // if expense type is recurring, set the budget dates to the recurring dates
        startDate = dates.startDate.format('YYYY-MM-DD');
        endDate = dates.endDate.format('YYYY-MM-DD');
      } else {
        // if expense type is not recurring, set the budget dates to the expense type dates
        startDate = expenseType.startDate;
        endDate = expenseType.endDate;
      }

      // create budget object
      let newBudget = {
        id: this._getUUID(),
        expenseTypeId: expenseType.id,
        userId: employee.id,
        reimbursedAmount: 0,
        pendingAmount: 0,
        fiscalStartDate: startDate,
        fiscalEndDate: endDate,
        amount: amount
      };

      // add budget object to budget table
      return this.budgetDynamo.addToDB(newBudget);
    });
  }

  async _delete(id) {
    logger.log(1, '_delete', `Attempting to delete employee ${id}`);

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
      logger.error('_delete', `Error code: ${err.code}`);

      throw err;
    }
  }

  _getBudgetDates(hireDate) {
    logger.log(2, '_getBudgetDates', `Getting budget dates for ${hireDate}`);

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
    logger.log(3, 'getBudgets', `Getting budgets for employee ${employeeID} with expense type ${expenseTypeID}`);

    return await this.budgetDynamo.queryWithTwoIndexesInDB(employeeID, expenseTypeID);
  }

  /**
   * Get all expense types.
   */
  async getExpenseTypes() {
    logger.log(2, 'getExpenseTypes', 'Getting all expense types');

    return await this.expenseTypeDynamo.getAllEntriesInDB();
  }

  _getUUID() {
    logger.log(4, '_getUUID', 'Getting random uuid');
    return uuid();
  }

  _hasAccess(employee, expenseType) {
    if (employee.workStatus == 0) {
      return false;
    } else if (expenseType.accessibleBy == 'ALL') {
      return true;
    } else if (expenseType.accessibleBy == 'FULL TIME') {
      return employee.workStatus == 100;
    } else if (expenseType.accessibleBy == 'PART TIME') {
      return employee.workStatus > 0 && employee.workStatus < 100;
    } else {
      return expenseType.accessibleBy.includes(employee.id);
    }
  }

  // TODO: write test for this function. Should throw error not return it.
  /**
   * Returns error code if an employee number or email is within the employee database. Return false if not.
   */
  async _isDuplicateEmployee(employee) {
    logger.log(2, '_isDuplicateEmployee', `Checking if user ${employee.id} is a duplicate employee`);

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
    logger.log(3, '_sortBudgets', 'Sorting budgets');

    return _.sortBy(budgets, [
      budget => {
        return moment(budget.fiscalStartDate, IsoFormat);
      }
    ]);
  }

  async _update(id, data) {
    logger.log(1, '_update', `Attempting to update user ${id}`);

    let newEmployee = new Employee(data);
    newEmployee.id = id;


    let oldEmployee = await this.databaseModify.findObjectInDB(id).catch(err => {
      throw err;
    });


    return this._updateBudgetDates(oldEmployee, newEmployee)
      .then(this._updateBudgetAmount(oldEmployee, newEmployee))
      .then(() => {
        return newEmployee;
      })
      .catch(err => {
        throw err;
      });
  }

  /*
   * Update the current employees budget amounts if the work status is changed
   */
  async _updateBudgetAmount(oldEmployeePromise, newEmployee) {
    let oldEmployee = await oldEmployeePromise;
    if (oldEmployee.workStatus == newEmployee.workStatus) {
      // return if the employee work status was not changed
      return Promise.resolve(newEmployee);
    }

    logger.log(2, '_updateBudgetAmount',
      `Attempting to update current budget amounts for user ${oldEmployee.id} from ${oldEmployee.workStatus}%`,
      `to ${newEmployee.workStatus}%`
    );

    try {
      // get all employee's budgets
      let employeeBudgets =
        await this.budgetDynamo.querySecondaryIndexInDB('userId-expenseTypeId-index', 'userId', oldEmployee.id);
      // get all expense types
      let expenseTypes = await this.getExpenseTypes();
      // filter for only current budgets
      let currentBudgets = _.filter(employeeBudgets, budget => {
        let start = moment(budget.fiscalStartDate, IsoFormat);
        let end = moment(budget.fiscalEndDate, IsoFormat);
        return moment().isBetween(start, end, 'day', '[]');
      });

      // update all current budget amounts
      _.forEach(currentBudgets, budget => {
        let newBudget = budget;
        let expenseType = _.find(expenseTypes, ['id', newBudget.expenseTypeId]);
        if (expenseType) {
          if (this._hasAccess(newEmployee, expenseType)) {
            // if employee has access to the expense type, set the adjusted amount
            newBudget.amount = this._adjustedBudget(expenseType, newEmployee);
          } else {
            // if employee does not have access to the expense type, set the amount to 0
            newBudget.amount = 0;
          }
          // update entry in dynamo table
          this.budgetDynamo.updateEntryInDB(newBudget).catch(err => { throw err; });
        }
      });
    } catch (err) {
      throw Promise.reject(err);
    }
    return Promise.resolve(newEmployee);
  }

  /**
   * Update budgets when hiring date changes
   */
  async _updateBudgetDates(oldEmployeePromise, newEmployee) {
    let oldEmployee = await oldEmployeePromise;

    // if hire date is not changed, resolve promise
    if (oldEmployee.hireDate === newEmployee.hireDate) {
      return Promise.resolve(newEmployee);
    }

    logger.log(2, '_updateBudgetDates',
      `Attempting to Change Hire Date for user ${oldEmployee.id} from ${oldEmployee.hireDate}`,
      `to ${newEmployee.hireDate}`
    );
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
}

module.exports = EmployeeRoutes;
