const jsonModify = require('../js/jsonModify')('expense.json');
const uuid = require('uuid/v4');

function _add(uuid,{
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

function _update(id, {
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

const crud = require('./crudRoutes')(jsonModify, _add, _update, uuid());
module.exports = Object.assign({}, crud, {
  _add,
  _update
});
