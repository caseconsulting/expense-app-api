const Budget = require('./../models/budget');
const Crud = require('./crudRoutes');
const DatabaseModify = require('../js/databaseModify');
const Employee = require('./../models/employee');
// const Expense = require('./../models/expense');
const ExpenseType = require('./../models/expenseType');
const Logger = require('../js/Logger');
const moment = require('moment');
const _ = require('lodash');

const ISOFORMAT = 'YYYY-MM-DD';
const logger = new Logger('expenseTypeRoutes');

class ExpenseTypeRoutes extends Crud {

  constructor() {
    super();
    this.databaseModify = new DatabaseModify('expense-types');
  } // constructor

  /**
   * Create an expense type. Returns the expense type created.
   *
   * @param data - data of expense type
   * @return ExpenseType - expense type created
   */
  async _create(data) {
    // log method
    logger.log(2, '_create', `Preparing to create expense type ${data.budgetName} with ID ${data.id}`);

    let expenseType = new ExpenseType(data);

    return this._validateExpenseType(expenseType)
      .then(() => {
        // log success
        logger.log(2, '_create', `Successfully prepared to create expense type ${data.budgetName} with ID ${data.id}`);

        // return created expense type
        return Promise.resolve(expenseType);
      })
      .catch(err => {
        // log error
        logger.log(2, '_create', `Failed to prepare create for expense type ${data.budgetName} with ID ${data.id}`);

        // return rejected promise
        return Promise.reject(err);
      });
  } // _create

  /**
   * Delete an expense type. Returns the expense type deleted.
   *
   * @param id - id of expense type
   * @return ExpenseType - expense type deleted
   */
  async _delete(id) {
    // log method
    logger.log(2, '_delete', `Preparing to delete expense type ${id}`);

    try {
      let expenseType = new ExpenseType(await this.databaseModify.getEntry(id));

      return this._validateDelete(expenseType)
        .then(() => {
          // log success
          logger.log(2, '_delete', `Successfully prepared to delete expense type ${id}`);

          // return expense type deleted
          return expenseType;
        })
        .catch(err => {
          throw err;
        });
    } catch (err) {
      // log error
      logger.log(2, '_delete', `Failed to prepare delete for expense type ${id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _delete

  /**
   * Reads an expense type from the database. Returns the expense type read.
   *
   * @param data - parameters of expense type
   * @return ExpenseType - expense type read
   */
  async _read(data) {
    // log method
    logger.log(2, '_read', `Attempting to read expense type ${data.id}`);

    // compute method
    try {
      let expenseType = new ExpenseType(await this.databaseModify.getEntry(data.id)); // read from database

      // log success
      logger.log(2, '_read', `Successfully read expense type ${data.id}`);

      // return expense type
      return expenseType;
    } catch (err) {
      // log error
      logger.log(2, '_read', `Failed to read expense type ${data.id}`);

      // return error
      return Promise.reject(err);
    }
  } // _read

  /**
   * Reads all expense types from the database. Returns all expense types.
   *
   * @return Array - all expense types
   */
  async _readAll() {
    // log method
    logger.log(2, '_readAll', 'Attempting to read all expense types');

    // compute method
    try {
      let expenseTypesData = await this.databaseModify.getAllEntriesInDB();
      let expenseTypes = _.map(expenseTypesData, expenseType => {
        expenseType.categories = _.map(expenseType.categories, category => {
          return JSON.parse(category);
        });
        return new ExpenseType(expenseType);
      });

      // log success
      logger.log(2, '_readAll', 'Successfully read all expense types');

      // return all expense types
      return expenseTypes;
    } catch (err) {
      // log error
      logger.log(2, '_readAll', 'Failed to read all expense types');

      // return error
      return Promise.reject(err);
    }
  } // readAll

  /**
   * Update expense type and budgets. Returns the expense type updated.
   *
   * @param data - data of expense type
   * @return ExpenseType - expense type updated
   */
  async _update(data) {
    // log method
    logger.log(2, '_update', `Preparing to update expense type ${data.budgetName} with ID ${data.id}`);

    // compute method
    try {
      let newExpenseType = new ExpenseType(data);
      let oldExpenseType = new ExpenseType(await this.databaseModify.getEntry(data.id));

      return this._validateExpenseType(newExpenseType)
        .then(() => this._validateUpdate(oldExpenseType, newExpenseType))
        .then(() => this._validateDates(newExpenseType))
        .then(() => this._updateBudgets(oldExpenseType, newExpenseType))
        .then(() => {
          // log success
          if (oldExpenseType.budgetName == newExpenseType.budgetName) {
            logger.log(2, '_update',
              `Successfully prepared to update expense type ${oldExpenseType.budgetName} with ID ${data.id}`
            );
          } else {
            logger.log(2, '_update',
              `Successfully prepared to update expense type ${oldExpenseType.budgetName} to`,
              `${newExpenseType.budgetName} with ID ${data.id}`
            );
          }

          // return expense type updated
          return newExpenseType;
        })
        .catch(err => {
          throw err;
        });
    } catch (err) {
      // log error
      logger.log(2, '_update', `Failed to prepare update for expense type ${data.budgetName} with ID ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _update

  /**
   * Updates budgets when changing an expense type.
   *
   * @param oldExpenseType - ExpenseType to be updated from
   * @param newExpenseType - ExpenseType to be updated to
   * @return Array - Array of Budgets updated
   */
  async _updateBudgets(oldExpenseType, newExpenseType) {
    // log method
    logger.log(2, '_updateBudgets', `Attempting to update budgets for expense type ${oldExpenseType.id}`);

    try {
      let budgets = [];

      let diffStart = oldExpenseType.startDate != newExpenseType.startDate;
      let diffEnd = oldExpenseType.endDate != newExpenseType.endDate;
      let diffBudget = oldExpenseType.budget != newExpenseType.budget;
      let diffAccessibleBy = oldExpenseType.accessibleBy != newExpenseType.accessibleBy;

      if (diffStart || diffEnd || diffBudget || diffAccessibleBy) {
        // need to update budgets
        let budgetsData =
          await this.budgetDynamo.querySecondaryIndexInDB('expenseTypeId-index', 'expenseTypeId', newExpenseType.id);

        budgets = _.map(budgetsData, budgetData => {
          return new Budget(budgetData);
        });

        let employees;
        if (diffBudget || diffAccessibleBy) {
          // get all employees if changing budget amount
          let employeesData = await this.employeeDynamo.getAllEntriesInDB();
          employees = _.map(employeesData, employeeData => {
            return new Employee(employeeData);
          });
        }

        let i; // index of budgets
        for (i = 0; i < budgets.length; i++) {
          if (diffBudget || diffAccessibleBy) {
            // update the budget amount for current budgets
            if (!newExpenseType.recurringFlag || budgets[i].isDateInRange(moment().format(ISOFORMAT))) {
              let employee = _.find(employees, ['id', budgets[i].employeeId]);
              budgets[i].amount = this.calcAdjustedAmount(employee, newExpenseType);
            }
          }

          if (diffStart) {
            // update the fiscal start date
            budgets[i].fiscalStartDate = newExpenseType.startDate;
          }

          if (diffEnd) {
            // update the fiscal end date
            budgets[i].fiscalEndDate = newExpenseType.endDate;
          }

          // update budget in database
          await this.budgetDynamo.updateEntryInDB(budgets[i])
            .then(() => {
              logger.log(3, '_updateBudgets', `Successfully updated budget ${budgets[i].id}`);
            })
            .catch(err => {
              logger.log(3, '_updateBudgets', `Failed updated budget ${budgets[i].id}`);
              throw err;
            });
        }
      }

      // log success
      logger.log(2, '_updateBudgets', `Successfully updated budgets for expense type ${oldExpenseType.id}`);

      // return updated bugets
      return budgets;
    } catch (err) {
      // log error
      logger.log(2, '_updateBudgets', `Failed to update budgets for expense type ${oldExpenseType.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _updateBudgets

  /**
   * Validate that an expense type dates are valid. Return true if the start date is before all expense purchase dates
   * and end date is after all expense purchase dates
   *
   * @param expenseType - ExpenseType to be validated
   * @return ExpenseType - validated expense type
   */
  async _validateDates(expenseType) {
    // log method
    logger.log(3, '_validateDates', `Validating dates for expense type ${expenseType.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating expense type dates.'
      };

      if (!expenseType.recurringFlag) {
        // expense type is not recurring
        // get all the expense type expenses
        let expenses =
          await this.expenseDynamo.querySecondaryIndexInDB('expenseTypeId-index', 'expenseTypeId', expenseType.id);

        if (expenses.length > 0) {
          // map all purchase dates
          let purchaseDates = _.map(expenses, expense => {
            return moment(expense.purchaseDate, ISOFORMAT);
          });

          let firstPurchaseDate = _.first(purchaseDates); // current first purchase date
          let lastPurchaseDate = _.first(purchaseDates); // current last purchase date

          // find first and last purchase dates
          _.forEach(purchaseDates, purchaseDate => {
            if (purchaseDate.isBefore(firstPurchaseDate)) {
              // update the first purchase date
              firstPurchaseDate = purchaseDate;
            }
            if (purchaseDate.isAfter(lastPurchaseDate)) {
              // update the last purchase date
              lastPurchaseDate = purchaseDate;
            }
          });

          if (moment(expenseType.startDate, ISOFORMAT).isAfter(firstPurchaseDate)) {
            // expense type start date is after the first purchase date
            // log error

            logger.log(2, '_validateDates',
              `Expense type start date ${expenseType.startDate} is after first expense purchased on`,
              `${firstPurchaseDate.format(ISOFORMAT)}`
            );

            // throw error
            err.message = `Start date must be before ${firstPurchaseDate.add(1, 'd').format(ISOFORMAT)}.`;
            throw err;
          }

          if (moment(expenseType.endDate, ISOFORMAT).isBefore(lastPurchaseDate)) {
            // expense type end date is before the last purchase date
            // log error
            logger.log(2, '_validateDates',
              `Expense type end date ${expenseType.endDate} is before last expense purchased on`,
              `${lastPurchaseDate.format(ISOFORMAT)}`
            );

            // throw error
            err.message = `End date must be after ${lastPurchaseDate.subtract(1, 'd').format(ISOFORMAT)}.`;
            throw err;
          }
        }
      }

      // log success
      logger.log(3, '_validateDates', `Successfully validated dates for expense type ${expenseType.id}`);

      // return expense type on success
      return Promise.resolve(expenseType);
    } catch (err) {
      // log error
      logger.log(3, '_validateDates', `Failed to validate dates for expense type ${expenseType.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateDates

  /**
  * Validate that an expense type can be deleted. Returns the expense type to be deleted if successfully validated,
  * otherwise returns an error.
  *
  * @param expenseType - ExpenseType to validate delete
  * @return ExpenseType - validated expense type
  */
  async _validateDelete(expenseType) {
    // log method
    logger.log(3, '_validateDelete', `Validating delete for expense type ${expenseType.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating delete for expense type.'
      };

      // get all expenses for this expense type
      let expenses =
        await this.expenseDynamo.querySecondaryIndexInDB('expenseTypeId-index', 'expenseTypeId', expenseType.id);

      // validate there are no expenses with this expense type
      if (expenses.length > 0) {
        // log error
        logger.log(3, '_validateDelete', `Expenses exist for expense type ${expenseType.budgetName}`);

        // throw error
        err.message = 'Cannot delete an expense type with expenses.';
        throw err;
      }

      // log success
      logger.log(2, '_validateDelete', `Successfully validated delete for expense type ${expenseType.id}`);

      // return expense type on success
      return expenseType;
    } catch (err) {
      // log error
      logger.log(3, '_validateDelete', `Failed to validate delete for expense type ${expenseType.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validatDelete

  /**
   * Validate that an expense type is valid. Returns the expense type if the expense type is successfully validated,
   * otherwise returns an error.
   *
   * @param expenseType - ExpenseType object to be validated
   * @return ExpenseType - validated expense type
   */
  _validateExpenseType(expenseType) {
    // log method
    logger.log(3, '_validateExpense', `Validating expense ${expenseType.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating expense type.'
      };

      // validate id
      if (_.isNil(expenseType.id)) {
        // log error
        logger.log(3, '_validateExpenseType', 'Expense type id is empty');

        // throw error
        err.message = 'Invalid expense type id.';
        throw err;
      }

      // validate budget name
      if (_.isNil(expenseType.budgetName)) {
        // log error
        logger.log(3, '_validateExpenseType', 'Expense type budget name is empty');

        // throw error
        err.message = 'Invalid expense type budget name.';
        throw err;
      }

      // validate budget
      if (_.isNil(expenseType.budget)) {
        // log error
        logger.log(3, '_validateExpenseType', 'Expense type budget is empty');

        // throw error
        err.message = 'Invalid expense type budget.';
        throw err;
      }

      // validate description
      if (_.isNil(expenseType.description)) {
        // log error
        logger.log(3, '_validateExpenseType', 'Expense type description is empty');

        // throw error
        err.message = 'Invalid expense type description.';
        throw err;
      }

      // validate accessibleBy
      if (_.isNil(expenseType.accessibleBy)) {
        // log error
        logger.log(3, '_validateExpenseType', 'Expense type accessibleBy is empty');

        // throw error
        err.message = 'Invalid expense type accessible by.';
        throw err;
      }

      // validate start and end date
      if (!expenseType.recurringFlag) {
        // expense type is non recurring
        if (_.isNil(expenseType.startDate)) {
          // log error
          logger.log(3, '_validateExpenseType', 'Expense type is not recurring and missing a start date');

          // throw error
          err.message = 'Start date required for non recurring expense type.';
          throw err;
        } else if (_.isNil(expenseType.endDate)) {
          // log error
          logger.log(3, '_validateExpenseType', 'Expense type is not recurring and missing an end date');

          // throw error
          err.message = 'End date required for non recurring expense type.';
          throw err;
        } else if (moment(expenseType.endDate, ISOFORMAT).isBefore(expenseType.startDate, ISOFORMAT)) {
          // log error
          logger.log(3, '_validateExpenseType',
            `Start date ${expenseType.startDate} is before end date ${expenseType.endDate}`
          );

          // throw error
          err.message = 'End date must be after start date.';
          throw err;
        }
      }

      // log success
      logger.log(3, '_validateExpenseType', `Successfully validated expense type ${expenseType.id}`);

      // return expense on success
      return Promise.resolve(expenseType);
    } catch (err) {
      // log error
      logger.log(3, '_validateExpenseType', `Failed to validate expense type ${expenseType.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateExpenseType

  /**
   * Validates that an expense type can be updated. Return the expense type if the expense type being updated is valid.
   *
   * @param oldExpenseType - ExpenseType being updated from
   * @param newExpenseType - ExpenseType being updated to
   * @return ExpenseType - validated expense type
   */
  _validateUpdate(oldExpenseType, newExpenseType) {
    // log method
    logger.log(3, '_validateUpdate', `Validating update for expense type ${oldExpenseType.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating update for expense type.'
      };

      // validate expense type id
      if (oldExpenseType.id != newExpenseType.id) {
        // log error
        logger.log(3, '_validateUpdate',
          `Old expense type id ${oldExpenseType.id} does not match new expense type id ${newExpenseType.id}`
        );

        // throw error
        err.message = 'Error validating expense type IDs.';
        throw err;
      }

      // validate expense type over draft flag
      if (oldExpenseType.odFlag != newExpenseType.odFlag) {
        // log error
        logger.log(3, '_validateUpdate',
          `Expense type odFlag cannot be changed from ${oldExpenseType.odFlag} to ${newExpenseType.odFlag}`
        );

        // throw error
        err.message = 'Cannot change expense type overdraft flag.';
        throw err;
      }

      // validate expense type recurring flag
      if (oldExpenseType.recurringFlag != newExpenseType.recurringFlag) {
        // log error
        logger.log(3, '_validateUpdate',
          `Expense type recurringFlag cannot be changed from ${oldExpenseType.recurringFlag} to`,
          `${newExpenseType.recurringFlag}`
        );

        // throw error
        err.message = 'Cannot change expense type recurring flag.';
        throw err;
      }
      // log success
      logger.log(3, '_validateUpdate', `Successfully validated update for expense type ${oldExpenseType.id}`);

      // return new expense type on success
      return Promise.resolve(newExpenseType);
    } catch (err) {
      // log error
      logger.log(3, '_validateUpdate', `Failed to validate update for expense type ${oldExpenseType.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateUpdate
} // ExpenseTypeRoutes

module.exports = ExpenseTypeRoutes;
