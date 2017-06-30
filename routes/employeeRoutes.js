
const jsonModify = require('../js/jsonModify')('employee.json');
// C
function _add({firstName, middleName, lastName, id, hireDate}) {
  console.log(firstName, middleName, lastName, id, hireDate);
  return {firstName, middleName, lastName, id, hireDate};
}
function _update(id, {name, budget, odFlag}) {
  console.log(id,name, budget, odFlag);
  return {id, name, budget, odFlag};
}

const crud = require('./crudRoutes')(jsonModify, _add, _update);
module.exports = crud;
