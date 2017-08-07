const Crud = require('./crudRoutes');
const JsonModify = require('../js/jsonModify');
class ExpenseRoutes extends Crud {
  constructor(jsonModify, uuid) {
    super(jsonModify, uuid);
    this.jsonModify = jsonModify;
  }


  _add(uuid, {
    purchaseDate,
    reimbursedDate,
    cost,
    description,
    note,
    receipt,
    expenseTypeId,
    userId
  }) {
    const expenseIs = this.validateCostToBudget(expenseTypeId, cost);
    if (expenseIs.valid) {
      return {
        id: uuid,
        purchaseDate,
        reimbursedDate,
        cost,
        description,
        note,
        receipt,
        expenseTypeId,
        userId
      };
    } else {
      return expenseIs;
    }
  }

  _update(id, {
    purchaseDate,
    reimbursedDate,
    cost,
    description,
    note,
    receipt,
    expenseTypeId,
    userId
  }) {
    return {
      id,
      purchaseDate,
      reimbursedDate,
      cost,
      description,
      note,
      receipt,
      expenseTypeId,
      userId
    };
  }

  validateCostToBudget(expenseTypeId, cost) {
    //new instance
    const expenseTypeJson = new JsonModify('expenseType.json');
    const expenseType = expenseTypeJson._specificFind("id", expenseTypeId);
    const remainingBudget = expenseType.budget - cost;

    if (remainingBudget < 0 && expenseTypeId.odFlag) {
      return {
        valid: true,
        remainingBudget: remainingBudget
      };
    } else if (remainingBudget >= 0) {
      return {
        valid: true,
        remainingBudget: remainingBudget
      };
    } else {
      return {
        valid: false,
        remainingBudget: remainingBudget
      };
    }

  }
}
module.exports = ExpenseRoutes;
