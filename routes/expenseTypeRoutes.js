const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const Moment = require('moment');
const MomentRange = require('moment-range');
const IsoFormat = 'YYYY-MM-DD';
const moment = MomentRange.extendMoment(Moment);
const _ = require('lodash');

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
    console.warn(
      `[${moment().format()}]`,
      `>>> Attempting to add expense type ${id}`,
      '| Processing handled by function expenseTypeRoutes._add'
    );

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
        throw err;
      });
  }

  async _checkDates(start, end, recurringFlag, id) {
    console.warn(
      `[${moment().format()}]`,
      'Validating expense type dates',
      '| Processing handled by function expenseTypeRoutes._checkDates'
    );

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
    console.warn(
      `[${moment().format()}]`,
      `Validating expense type ${expenseType.id}`,
      '| Processing handled by function expenseTypeRoutes._checkFields'
    );

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
    console.warn(
      `[${moment().format()}]`,
      `>>> Attempting to delete expense type ${id}`,
      '| Processing handled by function expenseTypeRoutes._delete'
    );

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
      console.error('Error Code: ' + err.code);
      throw err;
    }
  }

  async _updateBudgets(startDate, endDate, expenseTypeID) {
    console.warn(
      `[${moment().format()}]`,
      `Updating budgets for expense type ${expenseTypeID}`,
      '| Processing handled by function expenseTypeRoutes._updateBudgets'
    );

    let updatePromise;
    let budgets =
      await this.budgetDynamo.querySecondaryIndexInDB('expenseTypeId-index', 'expenseTypeId', expenseTypeID);

    budgets.forEach(budget => {
      budget.fiscalStartDate = startDate;
      budget.fiscalEndDate = endDate;
      updatePromise = this.budgetDynamo.updateEntryInDB(budget).catch(err => { return Promise.reject(err); });
    });

    return updatePromise;
  }

  _update(id, data) {
    console.warn(
      `[${moment().format()}]`,
      `>>> Attempting to update expense type ${id}`,
      '| Processing handled by function expenseTypeRoutes._update'
    );

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
        console.warn(
          `[${moment().format()}]`,
          `>>> Failed to update expense type ${id}`,
          '| Processing handled by function expenseTypeRoutes._update'
        );
        throw err;
      });
  }
}
module.exports = ExpenseTypeRoutes;
