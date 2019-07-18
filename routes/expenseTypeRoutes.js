const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const Moment = require('moment');
const MomentRange = require('moment-range');
const IsoFormat = 'YYYY-MM-DD';
const moment = MomentRange.extendMoment(Moment);

const ExpenseType = require('./../models/expenseType');

class ExpenseTypeRoutes extends Crud {
  constructor() {
    super();
    this.expenseTypeDynamo = new databaseModify('expense-types');
    this.databaseModify = this.expenseTypeDynamo;
  }

  _add(id, data) {
    console.warn(moment().format(), 'ExpenseType _add', `for expenseType ${id}`);

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
    console.warn(moment().format(), 'ExpenseType _update', `for expenseType ${id}`);

    let expenseType = new ExpenseType(data);
    expenseType.id = id;
    console.warn(expenseType);

    return this._checkFields(expenseType)
      .then(() => this._checkDates(expenseType.startDate, expenseType.endDate, expenseType.recurringFlag))
      .then(() => this.expenseTypeDynamo.updateEntryInDB(expenseType))
      .catch(err => {
        throw err;
      });
  }

  _checkFields(expenseType) {
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
