const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const budgetDynamo = new databaseModify('Employee');

class EmployeeRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = budgetDynamo;
  }

  _add(uuid, { firstName, middleName, lastName, empId, hireDate, expenseTypes, email, employeeRole }) {
    if (!middleName) {
      middleName = ' ';
    }

    return new Promise(resolve => {
      resolve({
        id: uuid,
        firstName,
        middleName,
        lastName,
        empId,
        hireDate,
        expenseTypes,
        email,
        employeeRole,
        isActive: true
      });
    });
  }

  _update(id, { firstName, middleName, lastName, empId, hireDate, expenseTypes, email, employeeRole, isActive }) {
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
          expenseTypes,
          email,
          employeeRole,
          isActive
        };
      })
      .catch(err => {
        throw err;
      });
  }
}

module.exports = EmployeeRoutes;
