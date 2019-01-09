const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const expenseTypesDyanmo = new databaseModify('expense-types');
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
    let dateCheck = recurringFlag || moment(startDate, IsoFormat).isSameOrBefore(endDate, IsoFormat);
    if(!dateCheck) {
      let err = {
        code: 403,
        message: 'Invalid Start Date and End Date.'
      };
      throw err;
    }
    let validFieldsCheck = budget > 0 && !!description && !!budgetName;
    if(!validFieldsCheck) {
      let err = {
        code: 403,
        message: 'There is a missing field in either the budget, description, or name.'
      };
      throw err;
    }
    return new Promise(resolve => {
      if (odFlag === undefined) {
        odFlag = false;
      }
      resolve({
        id: uuid,
        budgetName,
        budget,
        odFlag,
        description,
        startDate,
        endDate,
        recurringFlag
      });
    });
  }

  _update(id, { budgetName, budget, odFlag, description,startDate, endDate, recurringFlag }) {
    let dateCheck = recurringFlag || moment(startDate, IsoFormat).isSameOrBefore(endDate, IsoFormat);
    if(!dateCheck) {
      let err = {
        code: 403,
        message: 'Invalid Start Date and End Date.'
      };
      throw err;
    }
    let validFieldsCheck = budget > 0 && !!description && !!budgetName;
    if(!validFieldsCheck) {
      let err = {
        code: 403,
        message: 'There is a missing field in either the budget, description, or name.'
      };
      throw err;
    }
    return this.databaseModify
      .findObjectInDB(id)
      .then(() => {
        return {
          id,
          budgetName,
          budget,
          odFlag,
          description,
          startDate,
          endDate,
          recurringFlag
        };
      })
      .catch(err => {
        throw err;
      });
  }

}
module.exports = ExpenseTypeRoutes;
