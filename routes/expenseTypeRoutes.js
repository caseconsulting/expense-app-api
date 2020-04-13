const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const Moment = require('moment');
const MomentRange = require('moment-range');
const IsoFormat = 'YYYY-MM-DD';
const moment = MomentRange.extendMoment(Moment);
const _ = require('lodash');
const Logger = require('../js/Logger');
const logger = new Logger('expenseTypeRoutes');
const uuid = require('uuid/v4');

const ExpenseType = require('./../models/expenseType');

class ExpenseTypeRoutes extends Crud {
  constructor() {
    super();
    this.expenseTypeDynamo = new databaseModify('expense-types');
    this.budgetDynamo = new databaseModify('budgets');
    this.employeeDynamo = new databaseModify('employees');
    this.expenseData = new databaseModify('expenses');
    this.databaseModify = this.expenseTypeDynamo;
  }

  _add(id, data) {
    logger.log(1, '_add', `Attempting to add expense type ${id}`);

    let expenseType = new ExpenseType(data);
    expenseType.id = id;

    return this._checkFields(expenseType)
      .then(() => this._checkDates(expenseType.startDate,
        expenseType.endDate,
        expenseType.recurringFlag,
        expenseType.id)
      )
      .then(() => this._createBudgets(expenseType))
      .then(() => this.expenseTypeDynamo.addToDB(expenseType))
      .catch(err => {
        logger.log(1, '_add', `Failed to add expense type ${id}`);
        logger.error('_add', `Error code: ${err.code}`);
        throw err;
      });
  }

  async _createBudgets(expenseType) {
    logger.log(1, '_createBudgets', `Creating budgets for expense type ${expenseType.id}`);
    let employees = await this.employeeDynamo.getAllEntriesInDB();
    _.forEach(employees, employee => {
      if (this._hasAccess(employee, expenseType)) {
        let adjustedAmount = this._adjustedBudget(expenseType, employee);
        let start;
        let end;
        if (!expenseType.recurringFlag
          && !this._isEmpty(expenseType.startDate)
          && !this._isEmpty(expenseType.startDate)
        ) {
          start = expenseType.startDate;
          end = expenseType.endDate;
        } else {
          let dates = this._getBudgetDates(employee.hireDate);
          start = dates.startDate.format(IsoFormat);
          end = dates.endDate.format(IsoFormat);
        }
        let newBudget = {
          id: this._getUUID(),
          expenseTypeId: expenseType.id,
          userId: employee.id,
          reimbursedAmount: 0,
          pendingAmount: 0,
          fiscalStartDate: start,
          fiscalEndDate: end,
          amount: adjustedAmount
        };
        this.budgetDynamo.addToDB(newBudget);
      }
    });
    return Promise.resolve();
  }

  _adjustedBudget(expenseType, employee) {
    return (expenseType.budget * (employee.workStatus / 100.0)).toFixed(2);
  }

  async _checkDates(start, end, recurringFlag, id) {
    logger.log(2, '_checkDates', 'Validating expense type dates');

    let err = {
      code: 403,
      message: 'The dates are invalid.'
    };

    let valid = recurringFlag;

    let typeExpenses = await this.expenseData.querySecondaryIndexInDB('expenseTypeId-index', 'expenseTypeId', id);
    let allPurchaseDates = _.map(typeExpenses, 'purchaseDate');
    let firstExpenseDate = moment(_.first(allPurchaseDates), IsoFormat);
    let lastExpenseDate = moment(_.first(allPurchaseDates), IsoFormat);

    _.each(allPurchaseDates, current => {
      let currentDate = moment(current, IsoFormat);
      if (currentDate.isBefore(firstExpenseDate)) {
        firstExpenseDate = currentDate;
      }
      if (currentDate.isAfter(lastExpenseDate)) {
        lastExpenseDate = currentDate;
      }
    });

    if (!valid && !!start && !!end) {
      let startDate = moment(start, IsoFormat);
      let endDate = moment(end, IsoFormat);
      if (startDate.isBefore(endDate))
      {
        if (startDate.isAfter(firstExpenseDate) && endDate.isBefore(lastExpenseDate))
        {
          err.message = `Expenses exist. Start date must be before ${firstExpenseDate.format(IsoFormat)}`
            + ` and end date must be after ${lastExpenseDate.format(IsoFormat)}.`;
        } else if (startDate.isAfter(firstExpenseDate)) {
          err.message = `Expenses exist. Start date must be before ${firstExpenseDate.format(IsoFormat)}.`;
        } else if (endDate.isBefore(lastExpenseDate)) {
          err.message = `Expenses exist. End date must be after ${lastExpenseDate.format(IsoFormat)}.`;
        } else {
          valid = true;
        }
      }
    }

    return valid ? Promise.resolve() : Promise.reject(err);
  }

  _checkFields(expenseType) {
    logger.log(2, '_checkFields', `Validating expense type ${expenseType.id}`);

    let idCheck = !!expenseType.id;
    let budgetNameCheck = !!expenseType.budgetName;
    let budgetCheck = expenseType.budget > 0;
    let descriptionCheck = !!expenseType.description;
    let valid = idCheck && budgetNameCheck && budgetCheck && descriptionCheck;
    let err = {
      code: 403,
      message: 'One of the required fields is empty.'
    };
    return valid ? Promise.resolve() : Promise.reject(err);
  }

  async _delete(id) {
    logger.log(1, '_delete', `Attempting to delete expense type ${id}`);

    let expenseType, typeExpenses;

    try {
      typeExpenses = await this.expenseData.querySecondaryIndexInDB('expenseTypeId-index', 'expenseTypeId', id);

      //can only delete an expense type if they have no expense data
      if (typeExpenses.length === 0) {
        expenseType = new ExpenseType(await this.databaseModify.removeFromDB(id));
        return expenseType;
      } else {
        let err = {
          code: 403,
          message: 'Expense Type can not be deleted if they have expenses'
        };
        throw err;
      }
    } catch (err) {
      logger.log(1, '_delete', `Failed to delete expense type ${id}`);

      throw err;
    }
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

  _isEmpty(field) {
    logger.log(4, '_isEmpty', 'Checking if field exists');
    return field == null || field.trim().length <= 0;
  }

  /*
   * Updates all budgets with the given expense type
   */
  async _updateBudgets(expenseType) {

    // get the old expense type
    let oldExpenseType = await this.databaseModify.readFromDB(expenseType.id);

    let sameStart = oldExpenseType.startDate == expenseType.startDate;
    let sameEnd = oldExpenseType.endDate == expenseType.endDate;
    let sameBudget = oldExpenseType.budget == expenseType.budget;
    if (sameStart && sameEnd && sameBudget) {
      // return if neither the start date, end date, or budget amount is changed
      return Promise.resolve();
    }

    logger.log(2, '_updateBudgets', `Updating budgets for expense type ${expenseType.id}`);
    let updatePromise;
    // get all the budgets for the expense type
    let budgets =
      await this.budgetDynamo.querySecondaryIndexInDB('expenseTypeId-index', 'expenseTypeId', expenseType.id);

    let employees;
    if (!sameBudget) {
      // if the budget amount is changed, get all the employees
      employees = await this.employeeDynamo.getAllEntriesInDB();
    }

    budgets.forEach(budget => {
      if (!this._isEmpty(expenseType.startDate) && !sameStart) {
        // update the fiscal start date
        budget.fiscalStartDate = expenseType.startDate;
      }

      if (!this._isEmpty(expenseType.endDate) && !sameEnd) {
        // update the fiscal end date
        budget.fiscalEndDate = expenseType.endDate;
      }

      if (!sameBudget) {
        // update the budget amount
        let employee = _.find(employees, ['id', budget.userId]);
        if (this._hasAccess(employee, expenseType)) {
          budget.amount = this._adjustedBudget(expenseType, employee);
        } else {
          budget.amount = 0;
        }
      }

      updatePromise = this.budgetDynamo.updateEntryInDB(budget).catch(err => { return Promise.reject(err); });
    });

    return updatePromise;
  }

  _update(id, data) {
    logger.log(1, '_update', `Attempting to update expense type ${id}`);

    let expenseType = new ExpenseType(data);
    expenseType.id = id;

    return this._checkFields(expenseType)
      .then(() => this._checkDates(expenseType.startDate,
        expenseType.endDate,
        expenseType.recurringFlag,
        expenseType.id)
      )
      .then(() => this._updateBudgets(expenseType))
      .then(() => this.expenseTypeDynamo.updateEntryInDB(expenseType))
      .catch(err => {
        logger.log(1, '_update', `Failed to update expense type ${id}`);

        throw err;
      });
  }
}
module.exports = ExpenseTypeRoutes;
