const Crud = require('./crudRoutes');
class ExpenseTypeRoutes extends Crud {
  constructor(jsonModify, uuid) {
    super(jsonModify, uuid);
    this.jsonModify = jsonModify;
  }
  _add(uuid, {
    budgetName,
    budget,
    odFlag,
    description
  }) {
    let objectWasFound = this.jsonModify._specificFind(uuid);
    console.log(budgetName, budget, odFlag, description);
    if (objectWasFound) {
      console.log('** object already exists ** ', objectWasFound);
      return null;
    } else {
      if (odFlag === undefined) {
        odFlag = false;
      }
      console.log('Expense type being added', uuid, budgetName, budget, odFlag, description);
      return {
        id: uuid,
        budgetName,
        budget,
        odFlag,
        description
      };
    }
  }
  _update(id, {
    budgetName,
    budget,
    odFlag,
    description
  }) {
    console.log('updating...');
    if (odFlag === undefined) {
      odFlag = false;
    }
    console.log('Expense type being updated', id, budgetName, budget, odFlag, description);

    return {
      id,
      budgetName,
      budget,
      odFlag,
      description
    };
  }
}
module.exports = ExpenseTypeRoutes;