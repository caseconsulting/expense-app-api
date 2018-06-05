const Crud = require('./crudRoutes');
class ExpenseTypeRoutes extends Crud {
  constructor(databaseModify, uuid) {
    super(databaseModify, uuid);
    this.databaseModify = databaseModify;
  }
  _add(uuid, { budgetName, budget, odFlag, description }) {
    return new Promise(function(resolve) {
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

  _update(id, { budgetName, budget, odFlag, description }) {
    return this.databaseModify
      .findObjectInDB(id)
      .then(function() {
        return {
          id,
          budgetName,
          budget,
          odFlag,
          description
        };
      })
      .catch(function(err) {
        throw err;
      });
  }
}
module.exports = ExpenseTypeRoutes;
