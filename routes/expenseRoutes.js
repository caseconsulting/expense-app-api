const Crud = require('./crudRoutes');

class ExpenseRoutes extends Crud{
  constructor(jsonModify, uuid) {
    super(jsonModify, uuid);
    this.jsonModify = jsonModify;
  }


 _add(uuid,{
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
