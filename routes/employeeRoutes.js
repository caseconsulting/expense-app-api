const Crud = require('./crudRoutes');

class EmployeeRoutes extends Crud {
  constructor(databaseModify, uuid) {
    super(databaseModify, uuid);
    this.databaseModify = databaseModify;
  }

  _add(
    uuid,
    { firstName, middleName, lastName, empId, hireDate, expenseTypes }
  ) {
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
      reject('Not implemented');
    });
  }

  _update(
    id,
    { firstName, middleName, lastName, empId, hireDate, expenseTypes }
  ) {
    return this.databaseModify
      .findObjectInDB(id)
      .then(function() {
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
        // console.error(err);
        throw err;
      });
  }
}

module.exports = EmployeeRoutes;
