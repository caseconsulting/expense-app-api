const Crud = require('./crudRoutes');
class ExpenseTypeRoutes extends Crud {
  constructor(databaseModify, uuid) {
    super(databaseModify, uuid);
    this.databaseModify = databaseModify;
  }
  _add(uuid, {
    budgetName,
    budget,
    odFlag,
    description
  }) {
    console.log('Expense type being added:\n', uuid, budgetName, budget, odFlag, description);
    return new Promise(function(resolve, reject) {
      if (odFlag === undefined) {
        odFlag = false;
      }

      resolve({
        id: uuid,
        budgetName,
        budget,
        odFlag,
        description
      });
    });
  }
  _update(id, {
    budgetName,
    budget,
    odFlag,
    description
  }) {
    console.log('Expense type being updated:\n', id, budgetName, budget, odFlag, description);
    return new Promise(function(resolve, reject) {
      resolve({
        id,
        budgetName,
        budget,
        odFlag,
        description
      });
    });

  }
}
module.exports = ExpenseTypeRoutes;