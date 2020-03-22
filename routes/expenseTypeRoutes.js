const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const Moment = require('moment');
const MomentRange = require('moment-range');
const IsoFormat = 'YYYY-MM-DD';
const moment = MomentRange.extendMoment(Moment);
const _ = require('lodash');
const Util = require('../js/Util');
const util = new Util('expenseTypeRoutes');

const ExpenseType = require('./../models/expenseType');
const expenseDynamo = new databaseModify('expenses');

class ExpenseTypeRoutes extends Crud {
  constructor() {
    super();
    this.expenseTypeDynamo = new databaseModify('expense-types');
    this.budgetDynamo = new databaseModify('budgets');
    this.databaseModify = this.expenseTypeDynamo;
    this.expenseData = expenseDynamo;
  }

  _add(id, data) {
    util.log(1, '_add', `Attempting to add expense type ${id}`);

    let expenseType = new ExpenseType(data);
    expenseType.id = id;

    return this._checkFields(expenseType)
      .then(() => this._checkDates(expenseType.startDate,
        expenseType.endDate,
        expenseType.recurringFlag,
        expenseType.id)
      )
      .then(() => this.expenseTypeDynamo.addToDB(expenseType))
      .catch(err => {
        util.log(1, '_add', `Failed to add expense type ${id}`);
        util.error('_add', `Error code: ${err.code}`);
        throw err;
      });
  }

  async _checkDates(start, end, recurringFlag, id) {
    util.log(2, '_checkDates', 'Validating expense type dates');

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
    util.log(2, '_checkFields', `Validating expense type ${expenseType.id}`);

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
    util.log(1, '_delete', `Attempting to delete expense type ${id}`);

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
      util.log(1, '_delete', `Failed to delete expense type ${id}`);

      throw err;
    }
  }

  _isEmpty(field) {
    util.log(4, '_isEmpty', 'Checking if field exists');
    return field == null || field.trim().length <= 0;
  }

  async _updateBudgets(startDate, endDate, expenseTypeID) {
    util.log(2, '_updateBudgets', `Updating budgets for expense type ${expenseTypeID}`);

    let updatePromise;
    let budgets =
      await this.budgetDynamo.querySecondaryIndexInDB('expenseTypeId-index', 'expenseTypeId', expenseTypeID);

    budgets.forEach(budget => {
      if (!this._isEmpty(startDate) && !this._isEmpty(endDate)) {
        budget.fiscalStartDate = startDate;
        budget.fiscalEndDate = endDate;
      }
      updatePromise = this.budgetDynamo.updateEntryInDB(budget).catch(err => { return Promise.reject(err); });
    });

    return updatePromise;
  }

  _update(id, data) {
    util.log(1, '_update', `Attempting to update expense type ${id}`);

    let expenseType = new ExpenseType(data);
    expenseType.id = id;

    return this._checkFields(expenseType)
      .then(() => this._checkDates(expenseType.startDate,
        expenseType.endDate,
        expenseType.recurringFlag,
        expenseType.id)
      )
      .then(() => this._updateBudgets(expenseType.startDate, expenseType.endDate, expenseType.id))
      .then(() => this.expenseTypeDynamo.updateEntryInDB(expenseType))
      .catch(err => {
        util.log(1, '_update', `Failed to update expense type ${id}`);

        throw err;
      });
  }
}
module.exports = ExpenseTypeRoutes;
