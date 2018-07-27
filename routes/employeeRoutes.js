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
    let isActive = true;
    return new Promise(resolve => {
      resolve({
        id: uuid,
        firstName,
        middleName,
        lastName,
        empId,
        hireDate,
        expenseTypes,
        isActive
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
    let isActive = true;
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
          expenseTypes,
          isActive
        };
      })
      .catch(err => {
        throw err;
      });
  }
}

module.exports = EmployeeRoutes;
