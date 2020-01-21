const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const Moment = require('moment');
const MomentRange = require('moment-range');
const IsoFormat = 'YYYY-MM-DD';
const moment = MomentRange.extendMoment(Moment);

const ExpenseType = require('./../models/expenseType');
const expenseDynamo = new databaseModify('expenses');

class ExpenseTypeRoutes extends Crud {
  constructor() {
    super();
    this.expenseTypeDynamo = new databaseModify('expense-types');

    this.databaseModify = this.expenseTypeDynamo;
    this.expenseData = expenseDynamo;
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

  _add(id, data) {
    console.warn(
      `[${moment().format()}]`,
      `>>> Attempting to add expense type ${id}`,
      '| Processing handled by function expenseTypeRoutes._add'
    );

    let expenseType = new ExpenseType(data);
    expenseType.id = id;

    return this._checkFields(expenseType)
      .then(() => this._checkDates(expenseType.startDate, expenseType.endDate, expenseType.recurringFlag))
      .then(() => this.expenseTypeDynamo.addToDB(expenseType))
      .catch(err => {
        throw err;
      });
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
      .then(() => this._checkDates(expenseType.startDate, expenseType.endDate, expenseType.recurringFlag))
      .then(() => this.expenseTypeDynamo.updateEntryInDB(expenseType))
      .catch(err => {
        throw err;
      });
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

  _checkDates(startDate, endDate, recurringFlag) {
    console.warn(
      `[${moment().format()}]`,
      'Validating expense type dates',
      '| Processing handled by function expenseTypeRoutes._checkDates'
    );

    let valid = recurringFlag;
    if (!valid && !!startDate && !!endDate) {
      valid = moment(startDate, IsoFormat).isBefore(endDate, IsoFormat);
    }
    let err = {
      code: 403,
      message: 'The dates are invalid.'
    };
    return valid ? Promise.resolve() : Promise.reject(err);
  }
}
module.exports = ExpenseTypeRoutes;
