const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const expenseTypesDyanmo = new databaseModify('expense-types');
const uuid = require('uuid/v4');
const Moment = require('moment');
const MomentRange = require('moment-range');
const IsoFormat = 'YYYY-MM-DD';
const moment = MomentRange.extendMoment(Moment);

class ExpenseTypeRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = expenseTypesDyanmo;
  }
  _add(uuid, { budgetName, budget, odFlag, description,startDate, endDate, recurringFlag }) {
    let expenseType = {
      id: uuid,
      budgetName: budgetName,
      budget: parseFloat(budget),
      odFlag: odFlag,
      description: description,
      startDate: startDate,
      endDate: endDate,
      recurringFlag: recurringFlag
    };
    return this.checkValidity(expenseType)
      .then(() => expenseTypesDyanmo.addToDB(expenseType))
      .catch(err => {
        throw err;
      });
  }

  _update(id, { budgetName, budget, odFlag, description,startDate, endDate, recurringFlag }) {
    let expenseType = {
      id: uuid,
      budgetName: budgetName,
      budget: parseFloat(budget),
      odFlag: odFlag,
      description: description,
      startDate: startDate,
      endDate: endDate,
      recurringFlag: recurringFlag
    };
    return this.checkValidity(expenseType)
      .then(() => expenseTypesDyanmo.updateEntryInDB(expenseType))
      .catch(err => {
        throw err;
      });
  }
  checkValidity(expenseType) {
    let idCheck = !!expenseType.id;
    let budgetNameCheck = !!expenseType.budgetName;
    let budgetCheck =  expenseType.budget > 0;
    let descriptionCheck = !!expenseType.description;
    let recurringBool = expenseType !== undefined;
    let startDateCheck = recurringBool || !!expenseType.startDate;
    let endDateCheck = recurringBool || !!expenseType.endDate;
    let datesCheck = moment(expenseType.startDate, IsoFormat).isBefore(expenseType.endDate, IsoFormat);
    let fieldsCheck = idCheck && budgetNameCheck && budgetCheck && descriptionCheck;
    let validDates = startDateCheck && endDateCheck && datesCheck;
    let valid = fieldsCheck && validDates;
    let errMessage = '';
    if(!valid) {
      if(!fieldsCheck) {
        errMessage.append('One of the fields is empty.\n');
      }
      if(!validDates) {
        errMessage.append('The dates are not valid');
      }
    }
    let error = {
      code: 403,
      message: errMessage
    };
    return valid ? Promise.resolve() : Promise.reject(error);
  }
}
module.exports = ExpenseTypeRoutes;
