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
    hireDate,
    expenseTypes
  }) {

    let objectWasFound = this.jsonModify._specificFind("id", uuid);
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
        hireDate,
        expenseTypes
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
    hireDate,
    expenseTypes
  }) {
    return this.jsonModify._specificFind("id", id).then(function(data) {
        // if (data && data.id !== id) {
        //   return null;
        // } else {
        console.log(id, firstName, lastName);
        return {
          id,
          firstName,
          middleName,
          lastName,
          empId,
          hireDate,
          expenseTypes
        };
        // }
      })
      .catch(function(err) {
        console.log('didnt work', err);
      });

  }
}

module.exports = EmployeeRoutes;