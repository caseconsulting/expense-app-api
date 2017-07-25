const JsonModify = require('../js/jsonModify');
const jsonModify = new JsonModify('expense.json');
const uuid = require('uuid/v4');
const Crud = require('./crudRoutes');
const crud = new Crud(jsonModify, _add, _update, uuid());

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

module.exports = Object.assign({}, crud, {
  _add,
  _update
});
