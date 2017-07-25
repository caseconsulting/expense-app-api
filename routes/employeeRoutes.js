const jsonModify = require('../js/jsonModify')('employee.json');
const uuid = require('uuid/v4');

function _add(uuid, {
  firstName,
  middleName,
  lastName,
  empId,
  hireDate
}) {

  let objectWasFound = jsonModify._specificFind("empId", empId);
  console.log('object was found: ', objectWasFound);
  if (objectWasFound) {
    console.log('** object already exists ** ', objectWasFound);
    return null;
  } else {
    console.log('** object was added ** ', objectWasFound);
    let output = {
      id: uuid,
      firstName,
      middleName,
      lastName,
      empId,
      hireDate
    };
    console.log('else output ', output);
    return output
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
  if (found) {
    return null;
  } else {
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

const crud = require('./crudRoutes')(jsonModify, _add, _update, uuid());
module.exports = Object.assign({}, crud, {
  _add,
  _update
});
