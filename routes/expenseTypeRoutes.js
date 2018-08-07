const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const expenseTypesDyanmo = new databaseModify('expense-types');

class ExpenseTypeRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = expenseTypesDyanmo;
  }
  _add(uuid, { budgetName, budget, odFlag, description,startDate, endDate, recurringFlag }) {
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
