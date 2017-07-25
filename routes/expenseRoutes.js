const Crud = require('./crudRoutes');

class ExpenseRoutes extends Crud{
  constructor(jsonModify, uuid) {
    super(jsonModify, uuid);
    this.jsonModify = jsonModify;
  }


 _add(uuid,{
expenseId,
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
    id: uuid,
    expenseId,
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

 _update(id, {
  expenseId,
  purchaseDate,
  reimbursedDate,
  cost,
  description,
  note,
  receipt,
  expenseTypeId,
  userId
}){
  return {
    id,
    expenseId,
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
}
module.exports = ExpenseRoutes;
