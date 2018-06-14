const Crud = require('./crudRoutes');

class EmployeeRoutes extends Crud {
  constructor(databaseModify, uuid) {
    super(databaseModify, uuid);
    this.databaseModify = databaseModify;
  }

  _add(uuid, { firstName, middleName, lastName, empId, hireDate, expenseTypes }) {
    if (!middleName) {
      middleName = 'N/A';
    }
    return new Promise(resolve => {
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

  _update(id, { firstName, middleName, lastName, empId, hireDate, expenseTypes }) {
    if (!middleName) {
      middleName = 'N/A';
    }
    if (!expenseTypes) {
      expenseTypes = [];
    }
    return this.databaseModify
      .findObjectInDB(id)
      .then(() => {
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
      .catch(err => {
        throw err;
      });
  }
}

module.exports = EmployeeRoutes;
