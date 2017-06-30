const jsonModify = require('../js/jsonModify')('employee.json');
const uuid = require('uuid/v4');

function _add({firstName, middleName, lastName, empId, hireDate}) {
  
  console.log(firstName, middleName, lastName, empId, hireDate);
  return {id: uuid(), firstName, middleName, lastName , empId, hireDate};
}
function _update(id, {firstName, middleName, lastName, empId, hireDate}) {
  console.log(id, firstName, middleName, lastName, empId, hireDate);
  return {id, firstName, middleName, lastName, empId, hireDate};
}

const crud = require('./crudRoutes')(jsonModify, _add, _update);
module.exports = crud;
