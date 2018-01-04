const Crud = require('./crudRoutes');

class EmployeeRoutes extends Crud {
  constructor(databaseModify, uuid) {
    super(databaseModify, uuid);
    this.databaseModify = databaseModify;
  }

  _add(uuid, {
    firstName,
    middleName,
    lastName,
    empId,
    hireDate,
    expenseTypes
  }) {
    return new Promise(function(resolve, reject) {
      resolve({
        id: uuid,
        firstName,
        middleName,
        lastName,
        empId,
        hireDate,
        expenseTypes
      });
    });
  }

  _update(id, {
    firstName,
    middleName,
    lastName,
    empId,
    hireDate,
    expenseTypes
  }) {
    return this.databaseModify.findObjectInDB(id).then(function(data) {
        return {
          id,
          firstName,
          middleName,
          lastName,
          empId,
          hireDate,
          expenseTypes
        };
      })
      .catch(function(err) {
        console.log('didnt work', err);
      });

  }
}

module.exports = EmployeeRoutes;