const Crud = require('./crudRoutes');

class EmployeeRoutes extends Crud {
  constructor(jsonModify, uuid) {
    super(jsonModify, uuid);
    this.jsonModify = jsonModify;
  }


   _add(uuid, {
    firstName,
    middleName,
    lastName,
    empId,
    hireDate
  }) {

    let objectWasFound = this.jsonModify._specificFind("empId", empId);
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

   _update(id, {
    firstName,
    middleName,
    lastName,
    empId,
    hireDate
  }) {
    let found = this.jsonModify._specificFind("empId", empId);
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
}

module.exports = EmployeeRoutes;
