
const jsonModify = require('../js/jsonModify')('expenseType.json');
const uuid = require('uuid/v4');

function _add({name, budget, odFlag}) {
  console.log(name, budget, odFlag);
  return {id:  uuid(), name, budget, odFlag};
}

function _update(id, {name, budget, odFlag}) {
  console.log(id,name, budget, odFlag);
  return {id, name, budget, odFlag};
}

const crud = require('./crudRoutes')(jsonModify, _add, _update);
module.exports = crud;
