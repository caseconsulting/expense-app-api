const jsonModify = require('../js/jsonModify')('employee.json');
const uuid = require('uuid/v4');

function _add(uuid,{
  firstName,
  middleName,
  lastName,
  empId,
  hireDate
}) {

  let found = jsonModify._specificFind("empId", empId);
  console.log(" in add " + found);
  if(found){
    return null;
  }
  else {
    console.log(firstName, middleName, lastName, empId, hireDate);
    return {
      id: uuid,
      firstName,
      middleName,
      lastName,
      empId,
      hireDate
    };

  }
}


function _update(id, {
  firstName,
  middleName,
  lastName,
  empId,
  hireDate
}) {
  let found = jsonModify._specificFind("empId", empId);
  console.log(" in add " + found);
  if(found){
    return null;
  }
  else {
    return {
      id,
      firstName,
      middleName,
      lastName,
      empId,
      hireDate
    };
  }
}

const crud = require('./crudRoutes')(jsonModify, _add, _update,uuid());
module.exports = Object.assign({}, crud, {
  _add,
  _update
});
